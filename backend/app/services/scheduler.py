"""
Scheduler service for automatic order generation from subscriptions.

This should be run as a cron job or background task once per day (e.g., at 6:00 AM).
It generates orders for all active subscriptions that have today in their schedule.
"""
import asyncio
from datetime import date, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import async_session
from app.models.order import Order, OrderStatus, Subscription, TimeSlot
from app.models.user import User, UserRole, Balance, BalanceTransaction
from app.services.notifications import notify_all_couriers_new_order


def get_weekday_number(d: date) -> int:
    """Get weekday number (1=Mon, 7=Sun) from date"""
    return d.isoweekday()


def parse_schedule_days(schedule_str: str) -> list:
    """Parse schedule string to list of weekday numbers"""
    if not schedule_str:
        return []
    return [int(d.strip()) for d in schedule_str.split(",") if d.strip()]


async def generate_orders_for_today():
    """
    Main scheduler function.
    Generates orders for all active subscriptions scheduled for today.
    
    Returns: (generated_count, skipped_count)
    """
    today = date.today()
    today_weekday = get_weekday_number(today)
    
    generated = 0
    skipped = 0
    
    async with async_session() as db:
        # Get all active subscriptions
        result = await db.execute(
            select(Subscription).where(
                and_(
                    Subscription.is_active == True,
                    Subscription.used_credits < Subscription.total_credits
                )
            )
        )
        subscriptions = result.scalars().all()
        
        print(f"[SCHEDULER] Found {len(subscriptions)} active subscriptions")
        
        # Get all couriers for notifications
        couriers_result = await db.execute(
            select(User).where(
                and_(
                    User.role == UserRole.COURIER,
                    User.is_active == True
                )
            )
        )
        couriers = couriers_result.scalars().all()
        courier_tg_ids = [c.telegram_id for c in couriers if c.telegram_id]
        
        for sub in subscriptions:
            # Check if today is in schedule based on frequency
            should_generate = False
            
            if sub.frequency == 'daily':
                # Generate every day
                should_generate = True
            elif sub.frequency == 'every_other_day':
                # Generate every other day from start_date
                if sub.start_date:
                    days_since_start = (today - sub.start_date).days
                    # Generate on start date (day 0) and every 2 days after (day 2, 4, 6...)
                    should_generate = (days_since_start % 2 == 0)
                else:
                    # Fallback to schedule_days if no start_date
                    schedule_days = parse_schedule_days(sub.schedule_days)
                    should_generate = today_weekday in schedule_days
            elif sub.frequency == 'twice_week':
                # Use schedule_days for specific weekdays
                schedule_days = parse_schedule_days(sub.schedule_days)
                should_generate = today_weekday in schedule_days
            else:
                # Unknown frequency, skip
                should_generate = False
            
            if not should_generate:
                continue
            
            # Check if already generated today
            if sub.last_generated_date == today:
                skipped += 1
                print(f"[SCHEDULER] Subscription {sub.id}: Already generated today, skipping")
                continue
            
            # Check remaining credits
            remaining = sub.total_credits - sub.used_credits
            if remaining <= 0:
                print(f"[SCHEDULER] Subscription {sub.id}: No credits remaining")
                continue
            
            # Create order
            order = Order(
                user_id=sub.user_id,
                address_id=sub.address_id,
                date=today,
                time_slot=sub.default_time_slot or TimeSlot.MORNING,
                status=OrderStatus.SCHEDULED,
                is_subscription=True,
                subscription_id=sub.id,
                comment="Авто-заказ по подписке"
            )
            db.add(order)
            await db.flush()  # Get order.id
            
            # Deduct credit from balance
            balance_result = await db.execute(
                select(Balance).where(Balance.user_id == sub.user_id)
            )
            balance = balance_result.scalar_one_or_none()
            
            if balance and balance.credits > 0:
                balance.credits -= 1
                
                # Log transaction
                transaction = BalanceTransaction(
                    balance_id=balance.id,
                    amount=-1,
                    description=f"Авто-заказ по подписке #{order.id}",
                    order_id=order.id,
                )
                db.add(transaction)
            else:
                print(f"[SCHEDULER] Warning: User {sub.user_id} has no credits, but order created")
            
            # Update subscription
            sub.last_generated_date = today
            sub.used_credits += 1
            
            # Check if subscription should be deactivated
            if sub.used_credits >= sub.total_credits:
                sub.is_active = False
                print(f"[SCHEDULER] Subscription {sub.id} completed (used all credits)")
            
            generated += 1
            print(f"[SCHEDULER] Created order for subscription {sub.id}, user {sub.user_id}")
            
            # Get address for notification
            if sub.address:
                address_str = f"кв. {sub.address.apartment}"
                if sub.address.complex:
                    address_str = f"{sub.address.complex.name}, д. {sub.address.building}, " + address_str
                
                time_slot_str = sub.default_time_slot.value if sub.default_time_slot else "08:00-10:00"
                date_str = today.strftime('%d.%m.%Y')
                
                # Notify couriers
                await notify_all_couriers_new_order(
                    courier_telegram_ids=courier_tg_ids,
                    order_id=order.id,
                    address=address_str,
                    date_str=date_str,
                    time_slot=time_slot_str,
                    comment="Подписка",
                    tariff_type='subscription',
                    order_date=today
                )
        
        await db.commit()
    
    print(f"[SCHEDULER] Done! Generated: {generated}, Skipped: {skipped}")
    return generated, skipped


async def generate_orders_for_date(target_date: date):
    """
    Generate orders for a specific date (for testing or catch-up).
    """
    target_weekday = get_weekday_number(target_date)
    
    generated = 0
    
    async with async_session() as db:
        result = await db.execute(
            select(Subscription).where(
                and_(
                    Subscription.is_active == True,
                    Subscription.used_credits < Subscription.total_credits
                )
            )
        )
        subscriptions = result.scalars().all()
        
        for sub in subscriptions:
            # Check if target_date is in schedule based on frequency
            should_generate = False
            
            if sub.frequency == 'daily':
                should_generate = True
            elif sub.frequency == 'every_other_day':
                if sub.start_date:
                    days_since_start = (target_date - sub.start_date).days
                    should_generate = (days_since_start % 2 == 0)
                else:
                    schedule_days = parse_schedule_days(sub.schedule_days)
                    should_generate = target_weekday in schedule_days
            elif sub.frequency == 'twice_week':
                schedule_days = parse_schedule_days(sub.schedule_days)
                should_generate = target_weekday in schedule_days
            else:
                should_generate = False
            
            if not should_generate:
                continue
            
            # Check if order already exists for this date
            existing = await db.execute(
                select(Order).where(
                    and_(
                        Order.subscription_id == sub.id,
                        Order.date == target_date
                    )
                )
            )
            if existing.scalar_one_or_none():
                continue
            
            order = Order(
                user_id=sub.user_id,
                address_id=sub.address_id,
                date=target_date,
                time_slot=sub.default_time_slot or TimeSlot.MORNING,
                status=OrderStatus.SCHEDULED,
                is_subscription=True,
                subscription_id=sub.id,
                comment="Авто-заказ по подписке"
            )
            db.add(order)
            generated += 1
        
        await db.commit()
    
    return generated


# CLI entry point for cron jobs
if __name__ == "__main__":
    print(f"[SCHEDULER] Running for {date.today()}")
    asyncio.run(generate_orders_for_today())

