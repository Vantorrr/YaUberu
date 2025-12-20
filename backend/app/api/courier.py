from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Dict, Any
from datetime import date

from app.models import get_db, Order, OrderStatus, User, ResidentialComplex, Address

router = APIRouter()

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
        select(Order, Address)
        .join(Address, Order.address_id == Address.id)
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
    for order, addr in rows:
        response.append({
            "id": order.id,
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
async def take_order(order_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.status = OrderStatus.IN_PROGRESS
    await db.commit()
    return {"status": "ok"}

@router.post("/orders/{order_id}/complete")
async def complete_order(order_id: int, bags_count: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.status = OrderStatus.COMPLETED
    order.bags_count = bags_count
    await db.commit()
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

