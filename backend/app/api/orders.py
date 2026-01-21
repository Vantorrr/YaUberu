from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta

from app.models import get_db, Order, OrderStatus, TimeSlot, Address, Balance, BalanceTransaction, User, UserRole, ResidentialComplex, Subscription, Tariff
from app.api.deps import get_current_user
from app.services.notifications import notify_all_couriers_new_order, notify_admins_new_order, notify_client_order_created
from app.services.subscription_orders import generate_all_subscription_orders
from app.config import settings

router = APIRouter()


class TariffDetails(BaseModel):
    bags_count: int = 1
    duration: int = 14  # days
    frequency: str = 'every_other_day'  # 'daily', 'every_other_day', 'twice_week'


class CreateOrderRequest(BaseModel):
    address_id: int
    date: date
    time_slot: TimeSlot
    is_urgent: bool = False
    comment: Optional[str] = None
    tariff_type: Optional[str] = 'single'  # 'single', 'trial', 'monthly'
    tariff_details: Optional[TariffDetails] = None


class OrderResponse(BaseModel):
    id: int
    date: date
    time_slot: str
    status: str
    bags_count: int
    comment: Optional[str] = None
    
    class Config:
        from_attributes = True


class RescheduleRequest(BaseModel):
    new_date: str  # YYYY-MM-DD format
    new_time_slot: str  # e.g. "08:00 — 10:00"


@router.get("/", response_model=List[OrderResponse])
async def get_orders(
    status_filter: Optional[OrderStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's orders
    """
    query = select(Order).where(Order.user_id == current_user.id)
    
    if status_filter:
        query = query.where(Order.status == status_filter)
    
    query = query.order_by(Order.date.desc())
    result = await db.execute(query)
    orders = result.scalars().all()
    
    return orders


@router.post("/", response_model=OrderResponse)
async def create_order(
    request: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new order (uses credits from balance)
    """
    cost = 2 if request.is_urgent else 1
    
    # Check user balance
    result = await db.execute(
        select(Balance).where(Balance.user_id == current_user.id)
    )
    balance = result.scalar_one_or_none()
    
    if not balance or balance.credits < cost:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Недостаточно выносов. Нужно: {cost}, доступно: {balance.credits if balance else 0}"
        )
    
    # Verify address belongs to user
    result = await db.execute(
        select(Address).where(
            and_(Address.id == request.address_id, Address.user_id == current_user.id)
        )
    )
    address = result.scalar_one_or_none()
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    # Create order
    order = Order(
        user_id=current_user.id,
        address_id=request.address_id,
        date=request.date,
        time_slot=request.time_slot,
        status=OrderStatus.SCHEDULED,
        comment=request.comment
    )
    db.add(order)
    await db.flush()
    
    # Deduct credit
    balance.credits -= cost
    
    # Log transaction
    transaction = BalanceTransaction(
        balance_id=balance.id,
        amount=-cost,
        description=f"Заказ #{order.id} ({'Срочный' if request.is_urgent else 'Обычный'})",
        order_id=order.id,
    )
    db.add(transaction)
    
    # Create Subscription if tariff is trial or monthly
    if request.tariff_type in ['trial', 'monthly']:
        # For trial: check if user has EVER had a trial subscription (active or not)
        # For monthly: check if user has an active subscription
        if request.tariff_type == 'trial':
            existing_trial_result = await db.execute(
                select(Subscription).where(
                    Subscription.user_id == current_user.id,
                    Subscription.tariff == Tariff.TRIAL
                ).limit(1)
            )
            existing_sub = existing_trial_result.scalar_one_or_none()
        else:
            existing_sub_result = await db.execute(
                select(Subscription).where(
                    Subscription.user_id == current_user.id,
                    Subscription.is_active == True
                )
            )
            existing_sub = existing_sub_result.scalar_one_or_none()
        
        if not existing_sub:
            # Determine total credits and end date based on tariff
            total_credits = 7 if request.tariff_type == 'trial' else 15  # trial=7 days (2 weeks every other day), monthly=15
            end_date_delta = 14 if request.tariff_type == 'trial' else 30
            
            subscription = Subscription(
                user_id=current_user.id,
                address_id=request.address_id,
                tariff=Tariff.TRIAL if request.tariff_type == 'trial' else Tariff.MONTHLY,
                total_credits=total_credits,
                used_credits=0,
                schedule_days="1,3,5",  # Mon, Wed, Fri (every other day)
                default_time_slot=request.time_slot,
                is_active=True,
                start_date=date.today(),
                end_date=date.today() + timedelta(days=end_date_delta),
                frequency='every_other_day'
            )
            db.add(subscription)
            await db.flush()  # Get subscription ID
            
            # ADD subscription credits to balance (refund the order cost + add subscription credits)
            balance.credits += (cost + total_credits)  # Refund order cost + add subscription credits
            
            # Log subscription purchase
            subscription_transaction = BalanceTransaction(
                balance_id=balance.id,
                amount=total_credits,
                description=f"Подписка {'Пробная' if request.tariff_type == 'trial' else 'Месячная'} (+{total_credits} выносов)",
                order_id=order.id,
            )
            db.add(subscription_transaction)
            
            # Generate ALL orders for the entire subscription period
            print(f"[ORDER] Generating all orders for subscription {subscription.id}")
            created_orders = await generate_all_subscription_orders(db, subscription, start_from_date=subscription.start_date)
            print(f"[ORDER] Created {created_orders} orders for subscription period")
    
    await db.commit()
    await db.refresh(order)
    
    # === NOTIFY ALL COURIERS ===
    try:
        # Get all couriers
        couriers_result = await db.execute(
            select(User).where(User.role == UserRole.COURIER, User.is_active == True)
        )
        couriers = couriers_result.scalars().all()
        courier_tg_ids = [c.telegram_id for c in couriers if c.telegram_id]
        
        # Get address details
        # Build full address string
        address_parts = []
        
        # Add street (if available)
        if hasattr(address, 'street') and address.street:
            address_parts.append(address.street)
        
        # Add complex name (if available)
        if address.complex_id:
            complex_result = await db.execute(select(ResidentialComplex).where(ResidentialComplex.id == address.complex_id))
            complex_obj = complex_result.scalar_one_or_none()
            if complex_obj:
                address_parts.append(complex_obj.name)
        
        # Add building and apartment
        address_parts.append(f"д. {address.building}")
        address_parts.append(f"кв. {address.apartment}")
        
        address_str = ", ".join(address_parts)
        time_slot_str = request.time_slot.value if hasattr(request.time_slot, 'value') else str(request.time_slot)
        date_str = request.date.strftime('%d.%m.%Y')
        
        await notify_all_couriers_new_order(
            courier_telegram_ids=courier_tg_ids,
            order_id=order.id,
            address=address_str,
            date_str=date_str,
            time_slot=time_slot_str,
            comment=request.comment,
            tariff_type=request.tariff_type,
            order_date=request.date
        )
        
        # Notify client about order creation
        if current_user.telegram_id:
            await notify_client_order_created(
                client_telegram_id=current_user.telegram_id,
                order_id=order.id,
                address=address_str,
                date_str=date_str,
                time_slot=time_slot_str
            )
        
        # Notify admins about new order
        client_name = current_user.name or "Клиент"
        await notify_admins_new_order(
            admin_telegram_ids=settings.admin_ids,
            order_id=order.id,
            address=address_str,
            date_str=date_str,
            time_slot=time_slot_str,
            client_name=client_name
        )
    except Exception as e:
        print(f"[NOTIFY ERROR] Failed to notify couriers/admins/client: {e}")
    
    return order


@router.put("/{order_id}/reschedule")
async def reschedule_order(
    order_id: int,
    request: RescheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reschedule an order (allowed if > 24 hours before pickup)
    """
    result = await db.execute(
        select(Order).where(
            and_(Order.id == order_id, Order.user_id == current_user.id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Parse date
    try:
        new_date = date.fromisoformat(request.new_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    # Check if reschedule is allowed
    today = date.today()
    days_until_order = (order.date - today).days
    
    # Rule 1: Can only reschedule 1 day before (not on the day of pickup)
    if days_until_order < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Перенос возможен только за 1 день до выноса"
        )
    
    # Rule 2: Can only move to +1 day from original date
    expected_new_date = order.date + timedelta(days=1)
    if new_date != expected_new_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Можно перенести только на +1 день ({expected_new_date.strftime('%d.%m.%Y')})"
        )
    
    # Validate time slot
    if request.new_time_slot not in ['08:00 — 10:00', '12:00 — 14:00', '16:00 — 18:00', '20:00 — 22:00']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid time slot"
        )
    
    order.date = new_date
    order.time_slot = TimeSlot(request.new_time_slot)
    
    await db.commit()
    
    return {"status": "ok", "message": "Order rescheduled successfully"}


@router.delete("/{order_id}")
async def cancel_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel an order and refund credit
    """
    result = await db.execute(
        select(Order).where(
            and_(Order.id == order_id, Order.user_id == current_user.id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.status != OrderStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only scheduled orders can be cancelled"
        )
    
    # Refund credit
    result = await db.execute(
        select(Balance).where(Balance.user_id == current_user.id)
    )
    balance = result.scalar_one_or_none()
    
    if balance:
        balance.credits += 1 
        
        # Log refund
        transaction = BalanceTransaction(
            balance_id=balance.id,
            amount=1,
            description=f"Возврат за отмену заказа #{order.id}",
            order_id=order.id,
        )
        db.add(transaction)
    
    # If subscription order - update subscription used_credits
    if order.subscription_id:
        sub_result = await db.execute(
            select(Subscription).where(Subscription.id == order.subscription_id)
        )
        subscription = sub_result.scalar_one_or_none()
        if subscription and subscription.used_credits > 0:
            subscription.used_credits -= 1
            subscription.is_active = True  # Reactivate if was deactivated
    
    order.status = OrderStatus.CANCELLED
    print(f"[ORDER] Cancelled order #{order.id}, refunded 1 credit")
    
    await db.commit()
    
    return {"status": "ok", "message": "Order cancelled, credit refunded"}
