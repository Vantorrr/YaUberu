from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, extract
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel

from app.models import get_db, Order, OrderStatus, User, ResidentialComplex, Address, UserRole
from app.services.notifications import notify_client_courier_took_order, notify_client_order_completed


class TakeOrderRequest(BaseModel):
    courier_telegram_id: int

router = APIRouter()


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
        # Count scheduled orders
        # Join Order -> Address
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
        
    return response

@router.get("/buildings")
async def get_buildings(complex_id: int, db: AsyncSession = Depends(get_db)):
    """Get buildings in complex with orders"""
    today = date.today()
    
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
    # Sort buildings naturally? 
    return sorted(list(buildings))

@router.get("/orders")
async def get_orders(complex_id: int, building: str, db: AsyncSession = Depends(get_db)):
    """Get orders for specific building"""
    today = date.today()
    
    result = await db.execute(
        select(Order, Address, ResidentialComplex)
        .join(Address, Order.address_id == Address.id)
        .outerjoin(ResidentialComplex, Address.complex_id == ResidentialComplex.id)
        .where(
            and_(
                Address.complex_id == complex_id,
                Address.building == building,
                Order.date == today,
                Order.status.in_([OrderStatus.SCHEDULED, OrderStatus.IN_PROGRESS])
            )
        )
        .order_by(Order.time_slot)
    )
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
        
        response.append({
            "id": order.id,
            "complex_name": complex_name,
            "full_address": full_address,
            "building": addr.building,
            "entrance": addr.entrance,
            "floor": addr.floor,
            "apartment": addr.apartment,
            "intercom": addr.intercom,
            "time_slot": order.time_slot,
            "status": order.status.value,
            "comment": order.comment
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
    
    return {"status": "ok", "message": f"Заказ взят курьером {courier.name}"}

@router.post("/orders/{order_id}/complete")
async def complete_order(order_id: int, bags_count: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
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

