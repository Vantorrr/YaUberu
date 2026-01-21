"""
Service for generating all subscription orders upfront
"""
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Order, OrderStatus, Subscription, Balance, BalanceTransaction


async def generate_all_subscription_orders(
    db: AsyncSession,
    subscription: Subscription,
    start_from_date: date = None
):
    """
    Generate all orders for a subscription period upfront
    
    Args:
        db: Database session
        subscription: Subscription object
        start_from_date: Optional start date (default: subscription.start_date)
    
    Returns:
        Number of orders created
    """
    if not subscription.start_date or not subscription.end_date:
        return 0
    
    start = start_from_date or subscription.start_date
    end = subscription.end_date
    frequency = subscription.frequency
    
    # Get balance for credit deduction
    balance_result = await db.execute(
        select(Balance).where(Balance.user_id == subscription.user_id)
    )
    balance = balance_result.scalar_one_or_none()
    
    if not balance:
        print(f"[SUBSCRIPTION] Warning: No balance found for user {subscription.user_id}")
        return 0
    
    # Calculate all dates
    expected_dates = []
    current = start
    day_num = (start - subscription.start_date).days
    
    while current <= end:
        should_generate = False
        
        if frequency == 'daily':
            should_generate = True
        elif frequency == 'every_other_day':
            # Generate every other day from start_date
            days_from_start = (current - subscription.start_date).days
            should_generate = (days_from_start % 2 == 0)
        elif frequency == 'twice_week':
            # Use schedule_days (Mon/Wed/Fri or similar)
            # For now skip - not implemented
            pass
        
        if should_generate:
            expected_dates.append(current)
        
        current += timedelta(days=1)
    
    # Check which orders already exist
    existing_orders = await db.execute(
        select(Order.date).where(
            Order.subscription_id == subscription.id
        )
    )
    existing_dates = {row[0] for row in existing_orders.all()}
    
    # Create missing orders
    created_count = 0
    
    for order_date in expected_dates:
        if order_date in existing_dates:
            continue  # Already exists
        
        # Check if we have enough credits
        remaining_credits = subscription.total_credits - subscription.used_credits
        if remaining_credits <= 0:
            print(f"[SUBSCRIPTION] No more credits for subscription {subscription.id}")
            break
        
        # Create order
        order = Order(
            user_id=subscription.user_id,
            address_id=subscription.address_id,
            date=order_date,
            time_slot=subscription.default_time_slot,
            status=OrderStatus.SCHEDULED,
            is_subscription=True,
            subscription_id=subscription.id,
            bags_count=1,
            comment="Авто-заказ по подписке"
        )
        db.add(order)
        await db.flush()  # Get order ID
        
        # Deduct credit from balance
        if balance.credits > 0:
            balance.credits -= 1
            
            # Log transaction
            transaction = BalanceTransaction(
                balance_id=balance.id,
                amount=-1,
                description=f"Авто-заказ по подписке #{order.id} на {order_date.strftime('%d.%m')}",
                order_id=order.id,
            )
            db.add(transaction)
        
        # Update subscription
        subscription.used_credits += 1
        
        created_count += 1
        print(f"[SUBSCRIPTION] Created order #{order.id} for {order_date}")
    
    # Check if subscription completed
    if subscription.used_credits >= subscription.total_credits:
        subscription.is_active = False
    
    return created_count
