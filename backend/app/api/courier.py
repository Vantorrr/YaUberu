from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, extract
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel

from app.models import get_db, Order, OrderStatus, User, ResidentialComplex, Address, UserRole
from app.services.notifications import notify_client_courier_took_order, notify_client_order_completed, notify_admins_courier_took_order, notify_admins_order_completed
from app.config import settings


class TakeOrderRequest(BaseModel):
    courier_telegram_id: int

router = APIRouter()


# ================== COURIER CHECK ==================
@router.get("/check/{telegram_id}")
async def check_courier_status(telegram_id: int, db: AsyncSession = Depends(get_db)):
    """Check if a telegram user is a registered courier"""
    
    result = await db.execute(
        select(User).where(
            and_(
                User.telegram_id == telegram_id,
                User.role == UserRole.COURIER
            )
        )
    )
    courier = result.scalar_one_or_none()
    
    return {
        "is_courier": courier is not None,
        "courier_id": courier.id if courier else None,
        "name": courier.name if courier else None
    }


# ================== COURIER STATS ==================
@router.get("/stats/{telegram_id}")
async def get_courier_stats(telegram_id: int, db: AsyncSession = Depends(get_db)):
    """Get real statistics for a courier"""
    
    # Find courier
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    courier = result.scalar_one_or_none()
    
    if not courier:
        return {
            "today": {"orders": 0, "bags": 0},
            "week": {"orders": 0, "earned": 0},
            "month": {"orders": 0, "earned": 0},
            "rating": 5.0
        }
    
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_start = today.replace(day=1)
    
    # Today stats
    today_result = await db.execute(
        select(
            func.count(Order.id),
            func.coalesce(func.sum(Order.bags_count), 0)
        )
        .where(
            and_(
                Order.courier_id == courier.id,
                Order.date == today,
                Order.status == OrderStatus.COMPLETED
            )
        )
    )
    today_orders, today_bags = today_result.one()
    
    # Week stats
    week_result = await db.execute(
        select(func.count(Order.id))
        .where(
            and_(
                Order.courier_id == courier.id,
                Order.date >= week_ago,
                Order.status == OrderStatus.COMPLETED
            )
        )
    )
    week_orders = week_result.scalar() or 0
    
    # Month stats
    month_result = await db.execute(
        select(func.count(Order.id))
        .where(
            and_(
                Order.courier_id == courier.id,
                Order.date >= month_start,
                Order.status == OrderStatus.COMPLETED
            )
        )
    )
    month_orders = month_result.scalar() or 0
    
    # Calculate earnings (100 RUB per order for example)
    rate_per_order = 100
    week_earned = week_orders * rate_per_order
    month_earned = month_orders * rate_per_order
    
    return {
        "today": {"orders": int(today_orders), "bags": int(today_bags)},
        "week": {"orders": int(week_orders), "earned": int(week_earned)},
        "month": {"orders": int(month_orders), "earned": int(month_earned)},
        "rating": 5.0  # TODO: implement rating system
    }

@router.get("/complexes")
async def get_complexes_with_orders(db: AsyncSession = Depends(get_db)):
    """Get complexes that have scheduled orders for today"""
    today = date.today()
    
    # Get all active complexes
    result = await db.execute(select(ResidentialComplex).where(ResidentialComplex.is_active == True))
    complexes = result.scalars().all()
    
    response = []
    for comp in complexes:
        # Count scheduled orders for TODAY
        result = await db.execute(
            select(func.count(Order.id))
            .join(Address, Order.address_id == Address.id)
            .where(
                and_(
                    Address.complex_id == comp.id,
                    Order.date == today,
                    Order.status.in_([OrderStatus.SCHEDULED, OrderStatus.IN_PROGRESS])
                )
            )
        )
        count = result.scalar() or 0
        response.append({
            "id": comp.id,
            "name": comp.name,
            "orders_count": count
        })
    
    # Count orders with NO complex_id (Manual Addresses) for TODAY
    result = await db.execute(
        select(func.count(Order.id))
        .join(Address, Order.address_id == Address.id)
        .where(
            and_(
                Address.complex_id.is_(None),
                Order.date == today,
                Order.status.in_([OrderStatus.SCHEDULED, OrderStatus.IN_PROGRESS])
            )
        )
    )
    other_count = result.scalar() or 0
    
    if other_count > 0:
        response.append({
            "id": 0,
            "name": "📍 Другие адреса",
            "orders_count": other_count
        })
        
    return response

@router.get("/buildings")
async def get_buildings(complex_id: int, db: AsyncSession = Depends(get_db)):
    """Get buildings in complex with orders for TODAY"""
    today = date.today()
    
    if complex_id == 0:
        # Manual addresses: return "Street, Building"
        result = await db.execute(
            select(Address.street, Address.building)
            .join(Order, Order.address_id == Address.id)
            .where(
                and_(
                    Address.complex_id.is_(None),
                    Order.date == today,
                    Order.status.in_([OrderStatus.SCHEDULED, OrderStatus.IN_PROGRESS])
                )
            )
            .distinct()
        )
        rows = result.all()
        # Format: "Street, Building"
        buildings = [f"{r.street or ''}, {r.building}" for r in rows]
        return sorted(list(set(buildings)))
    
    result = await db.execute(
        select(Address.building)
        .join(Order, Order.address_id == Address.id)
        .where(
            and_(
                Address.complex_id == complex_id,
                Order.date == today,
                Order.status.in_([OrderStatus.SCHEDULED, OrderStatus.IN_PROGRESS])
            )
        )
        .distinct()
    )
    buildings = result.scalars().all()
    return sorted(list(buildings))

@router.get("/orders")
async def get_orders(complex_id: int, building: str, db: AsyncSession = Depends(get_db)):
    """Get orders for specific building - only today's orders"""
    today = date.today()
    
    query = select(Order, Address, ResidentialComplex)\
        .join(Address, Order.address_id == Address.id)\
        .outerjoin(ResidentialComplex, Address.complex_id == ResidentialComplex.id)
        
    if complex_id == 0:
        # Manual address
        # Parse "Street, Building"
        if ", " in building:
            street_val, building_val = building.rsplit(", ", 1)
        else:
            street_val = "" 
            building_val = building
            
        query = query.where(
            and_(
                Address.complex_id.is_(None),
                Address.street == street_val,
                Address.building == building_val,
                Order.date == today,
                Order.status.in_([OrderStatus.SCHEDULED, OrderStatus.IN_PROGRESS])
            )
        )
    else:
        query = query.where(
            and_(
                Address.complex_id == complex_id,
                Address.building == building,
                Order.date == today,
                Order.status.in_([OrderStatus.SCHEDULED, OrderStatus.IN_PROGRESS])
            )
        )
        
    result = await db.execute(query.order_by(Order.time_slot))
    rows = result.all()
    
    response = []
    for order, addr, complex_obj in rows:
        # Build full address string
        if complex_obj:
            full_address = f"{complex_obj.name}, д. {addr.building}"
            complex_name = complex_obj.name
        else:
            full_address = f"д. {addr.building}"
            complex_name = "Другой адрес"
        
        # Get courier telegram_id if assigned
        courier_telegram_id = None
        if order.courier_id:
            courier_result = await db.execute(select(User.telegram_id).where(User.id == order.courier_id))
            courier_telegram_id = courier_result.scalar_one_or_none()
        
        response.append({
            "id": order.id,
            "complex_name": complex_name,
            "full_address": full_address,
            "building": addr.building,
            "entrance": addr.entrance,
            "floor": addr.floor,
            "apartment": addr.apartment,
            "intercom": addr.intercom,
            "date": order.date.strftime('%d.%m.%Y') if order.date else None,
            "time_slot": order.time_slot,
            "status": order.status.value,
            "comment": order.comment,
            "courier_telegram_id": courier_telegram_id
        })
        
    return response

@router.post("/orders/{order_id}/take")
async def take_order(order_id: int, request: TakeOrderRequest, db: AsyncSession = Depends(get_db)):
    # Get order
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != OrderStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail="Order already taken")
    
    # Get courier
    result = await db.execute(select(User).where(User.telegram_id == request.courier_telegram_id))
    courier = result.scalar_one_or_none()
    if not courier:
        raise HTTPException(status_code=404, detail="Courier not found")
    
    # Assign courier and update status
    order.courier_id = courier.id
    order.status = OrderStatus.IN_PROGRESS
    await db.commit()
    
    # Get address for notification
    result = await db.execute(select(Address).where(Address.id == order.address_id))
    addr = result.scalar_one_or_none()
    address_str = ""
    if addr:
        if addr.complex_id:
            result = await db.execute(select(ResidentialComplex).where(ResidentialComplex.id == addr.complex_id))
            complex = result.scalar_one_or_none()
            if complex:
                address_str = f"{complex.name}, д. {addr.building}, кв. {addr.apartment}"
            else:
                address_str = f"д. {addr.building}, кв. {addr.apartment}"
        else:
            address_str = f"{addr.street}, д. {addr.building}, кв. {addr.apartment}"
    
    # === NOTIFY CLIENT ===
    try:
        # Get client
        result = await db.execute(select(User).where(User.id == order.user_id))
        client = result.scalar_one_or_none()
        
        if client and client.telegram_id:
            time_slot_str = order.time_slot.value if hasattr(order.time_slot, 'value') else str(order.time_slot)
            await notify_client_courier_took_order(
                client_telegram_id=client.telegram_id,
                courier_name=courier.name,
                time_slot=time_slot_str
            )
    except Exception as e:
        print(f"[NOTIFY ERROR] Failed to notify client: {e}")
    
    # === NOTIFY ADMINS ===
    try:
        await notify_admins_courier_took_order(
            admin_telegram_ids=settings.admin_ids,
            order_id=order.id,
            courier_name=courier.name,
            address=address_str
        )
    except Exception as e:
        print(f"[NOTIFY ERROR] Failed to notify admins: {e}")
    
    return {"status": "ok", "message": f"Заказ взят курьером {courier.name}"}

@router.post("/orders/{order_id}/complete")
async def complete_order(order_id: int, bags_count: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get courier name for notifications
    courier_name = "Курьер"
    if order.courier_id:
        result = await db.execute(select(User).where(User.id == order.courier_id))
        courier = result.scalar_one_or_none()
        if courier:
            courier_name = courier.name
    
    # DEDUCT CREDIT FROM USER BALANCE (for subscription orders)
    if order.is_subscription and order.subscription_id:
        from app.models import Balance, BalanceTransaction, Subscription
        
        # Get user balance
        balance_result = await db.execute(select(Balance).where(Balance.user_id == order.user_id))
        balance = balance_result.scalar_one_or_none()
        
        if balance and balance.credits > 0:
            balance.credits -= 1
            
            # Log transaction
            transaction = BalanceTransaction(
                balance_id=balance.id,
                amount=-1,
                description=f"Выполнен заказ #{order.id}",
                order_id=order.id
            )
            db.add(transaction)
            print(f"[COURIER] Deducted 1 credit for completed order #{order.id}")
        
        # Update subscription used_credits
        sub_result = await db.execute(select(Subscription).where(Subscription.id == order.subscription_id))
        subscription = sub_result.scalar_one_or_none()
        if subscription:
            subscription.used_credits += 1
            # Check if subscription is complete
            if subscription.used_credits >= subscription.total_credits:
                subscription.is_active = False
        
    order.status = OrderStatus.COMPLETED
    order.bags_count = bags_count
    await db.commit()
    
    # === NOTIFY CLIENT ===
    try:
        result = await db.execute(select(User).where(User.id == order.user_id))
        client = result.scalar_one_or_none()
        
        if client and client.telegram_id:
            await notify_client_order_completed(
                client_telegram_id=client.telegram_id,
                bags_count=bags_count
            )
    except Exception as e:
        print(f"[NOTIFY ERROR] Failed to notify client on completion: {e}")
    
    # === NOTIFY ADMINS ===
    try:
        await notify_admins_order_completed(
            admin_telegram_ids=settings.admin_ids,
            order_id=order.id,
            courier_name=courier_name,
            bags_count=bags_count
        )
    except Exception as e:
        print(f"[NOTIFY ERROR] Failed to notify admins on completion: {e}")
    
    return {"status": "ok"}

@router.post("/orders/{order_id}/undo")
async def undo_order(order_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = OrderStatus.SCHEDULED
    await db.commit()
    return {"status": "ok"}

