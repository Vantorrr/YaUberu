from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta

from app.models import get_db, Order, OrderStatus, TimeSlot, Address, Balance, BalanceTransaction, User, UserRole, ResidentialComplex
from app.api.deps import get_current_user
from app.services.notifications import notify_all_couriers_new_order, notify_admins_new_order, notify_client_order_created
from app.config import settings

router = APIRouter()


class CreateOrderRequest(BaseModel):
    address_id: int
    date: date
    time_slot: TimeSlot
    is_urgent: bool = False
    comment: Optional[str] = None


class OrderResponse(BaseModel):
    id: int
    date: date
    time_slot: str
    status: str
    bags_count: int
    comment: Optional[str] = None
    
    class Config:
        from_attributes = True


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
        
        await notify_all_couriers_new_order(
            courier_telegram_ids=courier_tg_ids,
            order_id=order.id,
            address=address_str,
            time_slot=time_slot_str,
            comment=request.comment
        )
        
        # Notify client about order creation
        if current_user.telegram_id:
            await notify_client_order_created(
                client_telegram_id=current_user.telegram_id,
                order_id=order.id,
                address=address_str,
                time_slot=time_slot_str
            )
        
        # Notify admins about new order
        client_name = current_user.first_name or current_user.username or "Клиент"
        await notify_admins_new_order(
            admin_telegram_ids=settings.admin_ids,
            order_id=order.id,
            address=address_str,
            time_slot=time_slot_str,
            client_name=client_name
        )
    except Exception as e:
        print(f"[NOTIFY ERROR] Failed to notify couriers/admins/client: {e}")
    
    return order


@router.put("/{order_id}/reschedule")
async def reschedule_order(
    order_id: int,
    new_date: date,
    new_time_slot: TimeSlot,
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
    
    # Check if reschedule is allowed (> 24 hours before)
    if order.date <= date.today() + timedelta(days=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reschedule order less than 24 hours before pickup"
        )
    
    order.date = new_date
    order.time_slot = new_time_slot
    
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
    balance = result.scalar_one()
    balance.credits += 1 
    
    # Log refund
    transaction = BalanceTransaction(
        balance_id=balance.id,
        amount=1,
        description=f"Возврат за отмену заказа #{order.id}",
        order_id=order.id,
    )
    db.add(transaction)
    
    order.status = OrderStatus.CANCELLED
    
    await db.commit()
    
    return {"status": "ok", "message": "Order cancelled, credit refunded"}
