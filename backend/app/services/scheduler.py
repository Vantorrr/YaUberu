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
from app.models.user import User, UserRole
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
            # Check if today is in schedule
            schedule_days = parse_schedule_days(sub.schedule_days)
            
            if today_weekday not in schedule_days:
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
            
            # Update subscription
            sub.last_generated_date = today
            # Note: credits are deducted when order is completed, not created
            
            generated += 1
            print(f"[SCHEDULER] Created order for subscription {sub.id}, user {sub.user_id}")
            
            # Get address for notification
            if sub.address:
                address_str = f"кв. {sub.address.apartment}"
                if sub.address.complex:
                    address_str = f"{sub.address.complex.name}, д. {sub.address.building}, " + address_str
                
                time_slot_str = sub.default_time_slot.value if sub.default_time_slot else "08:00-10:00"
                
                # Notify couriers
                await notify_all_couriers_new_order(
                    courier_telegram_ids=courier_tg_ids,
                    order_id=order.id,
                    address=address_str,
                    time_slot=time_slot_str,
                    comment="Подписка"
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
            schedule_days = parse_schedule_days(sub.schedule_days)
            
            if target_weekday not in schedule_days:
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

