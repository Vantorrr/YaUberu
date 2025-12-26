from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

from app.models import (
    get_db, User, UserRole, Order, OrderStatus,
    ResidentialComplex, Subscription, Balance, BalanceTransaction, TariffPrice, ComplexBuilding
)
from app.services.scheduler import generate_orders_for_today

router = APIRouter()


class ComplexCreate(BaseModel):
    name: str
    short_name: Optional[str] = None
    buildings: List[str] = []


class CourierCreate(BaseModel):
    telegram_id: int
    name: str


class AssignCourierRequest(BaseModel):
    courier_id: int


class StatsResponse(BaseModel):
    total_orders_today: int
    completed_today: int
    active_subscriptions: int
    total_revenue_month: float


class TariffResponse(BaseModel):
    id: int
    tariff_type: str
    name: str
    price: str
    old_price: Optional[str]
    period: Optional[str]
    description: Optional[str]


@router.get("/public/tariffs", response_model=List[TariffResponse])
async def get_public_tariffs(db: AsyncSession = Depends(get_db)):
    """
    PUBLIC endpoint - get all tariffs for client app
    """
    result = await db.execute(select(TariffPrice).where(TariffPrice.is_active == True))
    tariffs = result.scalars().all()
    
    # Convert to response format
    return [
        TariffResponse(
            id=t.id,
            tariff_type=t.tariff_id,  # tariff_id -> tariff_type
            name=t.name,
            price=str(t.price),  # int -> str
            old_price=str(t.old_price) if t.old_price else None,  # int -> str
            period=t.period,
            description=t.description
        )
        for t in tariffs
    ]


@router.get("/stats", response_model=StatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    Get dashboard statistics for admin
    """
    today = date.today()
    
    # Orders today
    result = await db.execute(
        select(func.count(Order.id)).where(Order.date == today)
    )
    total_today = result.scalar() or 0
    
    # Completed today
    result = await db.execute(
        select(func.count(Order.id)).where(
            Order.date == today,
            Order.status == OrderStatus.COMPLETED
        )
    )
    completed_today = result.scalar() or 0
    
    # Active subscriptions
    result = await db.execute(
        select(func.count(Subscription.id)).where(Subscription.is_active == True)
    )
    active_subs = result.scalar() or 0
    
    return StatsResponse(
        total_orders_today=total_today,
        completed_today=completed_today,
        active_subscriptions=active_subs,
        total_revenue_month=0
    )


@router.get("/orders/today")
async def get_today_orders(
    db: AsyncSession = Depends(get_db),
):
    """
    Get all orders for today
    """
    today = date.today()
    
    result = await db.execute(
        select(Order).where(Order.date == today).order_by(Order.time_slot)
    )
    orders = result.scalars().all()
    
    return orders


@router.post("/orders/{order_id}/assign")
async def assign_courier(
    order_id: int,
    request: AssignCourierRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Assign a courier to an order
    """
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    result = await db.execute(select(User).where(User.id == request.courier_id, User.role == UserRole.COURIER))
    courier = result.scalar_one_or_none()
    
    if not courier:
        raise HTTPException(status_code=404, detail="Courier not found")
        
    order.courier_id = courier.id
    order.status = OrderStatus.IN_PROGRESS
    await db.commit()
    
    return {"status": "ok", "message": f"Assigned to {courier.name}"}


@router.post("/orders/{order_id}/cancel")
async def cancel_order_admin(
    order_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel order by admin
    """
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.status == OrderStatus.CANCELLED:
        return {"status": "ok", "message": "Already cancelled"}
        
    # Refund logic
    result = await db.execute(select(Balance).where(Balance.user_id == order.user_id))
    balance = result.scalar_one()
    balance.credits += 1
    
    transaction = BalanceTransaction(
        balance_id=balance.id,
        amount=1,
        description=f"Отмена заказа #{order.id} администратором",
        order_id=order.id,
    )
    db.add(transaction)
    
    order.status = OrderStatus.CANCELLED
    await db.commit()
    
    return {"status": "ok", "message": "Order cancelled"}


@router.post("/complexes", response_model=dict)
async def create_complex(
    request: ComplexCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Add a new residential complex with buildings
    """
    complex = ResidentialComplex(
        name=request.name,
        short_name=request.short_name or request.name[:10],
    )
    db.add(complex)
    await db.flush()
    
    for b_num in request.buildings:
        if b_num.strip():
            db.add(ComplexBuilding(complex_id=complex.id, building_number=b_num.strip()))
            
    await db.commit()
    await db.refresh(complex)
    
    return {"id": complex.id, "name": complex.name}


@router.get("/complexes")
async def list_complexes(
    db: AsyncSession = Depends(get_db),
):
    """
    List all residential complexes
    """
    result = await db.execute(
        select(ResidentialComplex).options(selectinload(ResidentialComplex.buildings))
    )
    complexes = result.scalars().all()
    
    return [{
        "id": c.id, 
        "name": c.name, 
        "short_name": c.short_name, 
        "is_active": c.is_active,
        "buildings": [b.building_number for b in c.buildings]
    } for c in complexes]


@router.delete("/complexes/{complex_id}")
async def delete_complex(
    complex_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a residential complex
    """
    result = await db.execute(select(ResidentialComplex).where(ResidentialComplex.id == complex_id))
    complex = result.scalar_one_or_none()
    
    if not complex:
        raise HTTPException(status_code=404, detail="Complex not found")
        
    await db.delete(complex)
    await db.commit()
    
    return {"status": "ok", "message": "Complex deleted"}


@router.post("/couriers", response_model=dict)
async def add_courier(
    request: CourierCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Add a new courier
    """
    # Check if user exists
    result = await db.execute(
        select(User).where(User.telegram_id == request.telegram_id)
    )
    user = result.scalar_one_or_none()
    
    if user:
        # Update role
        user.role = UserRole.COURIER
        user.name = request.name
    else:
        # Create new courier
        user = User(
            telegram_id=request.telegram_id,
            name=request.name,
            role=UserRole.COURIER,
        )
        db.add(user)
    
    await db.commit()
    await db.refresh(user)
    
    return {"id": user.id, "name": user.name, "role": user.role.value}


@router.get("/couriers")
async def list_couriers(
    db: AsyncSession = Depends(get_db),
):
    """
    List all couriers
    """
    result = await db.execute(
        select(User).where(User.role == UserRole.COURIER)
    )
    couriers = result.scalars().all()
    
    return [{"id": c.id, "name": c.name, "telegram_id": c.telegram_id, "is_active": c.is_active} for c in couriers]


@router.delete("/couriers/{courier_id}")
async def deactivate_courier(
    courier_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Deactivate a courier
    """
    result = await db.execute(
        select(User).where(User.id == courier_id, User.role == UserRole.COURIER)
    )
    courier = result.scalar_one_or_none()
    
    if not courier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courier not found"
        )
    
    courier.is_active = False
    await db.commit()
    
    return {"status": "ok", "message": "Courier deactivated"}


# ================== CLIENTS ==================

@router.get("/clients")
async def list_clients(
    db: AsyncSession = Depends(get_db),
):
    """
    List all clients (users with CLIENT role)
    """
    result = await db.execute(
        select(User).where(User.role == UserRole.CLIENT).order_by(User.created_at.desc())
    )
    clients = result.scalars().all()
    
    client_list = []
    for client in clients:
        # Get balance
        balance_result = await db.execute(
            select(Balance).where(Balance.user_id == client.id)
        )
        balance = balance_result.scalar_one_or_none()
        
        # Get active subscriptions count
        subs_result = await db.execute(
            select(func.count(Subscription.id)).where(
                Subscription.user_id == client.id,
                Subscription.is_active == True
            )
        )
        active_subs = subs_result.scalar() or 0
        
        # Get total orders count
        orders_result = await db.execute(
            select(func.count(Order.id)).where(Order.user_id == client.id)
        )
        total_orders = orders_result.scalar() or 0
        
        client_list.append({
            "id": client.id,
            "name": client.name,
            "telegram_id": client.telegram_id,
            "phone": client.phone,
            "balance": balance.credits if balance else 0,
            "active_subscriptions": active_subs,
            "total_orders": total_orders,
            "created_at": client.created_at.isoformat() if client.created_at else None,
        })
    
    return client_list


class AddCreditsRequest(BaseModel):
    user_id: int
    amount: int
    description: Optional[str] = None


class TariffPriceUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[int] = None
    old_price: Optional[int] = None
    period: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_urgent: Optional[bool] = None


@router.post("/clients/add-credits")
async def add_credits_to_client(
    request: AddCreditsRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Add credits to a client's balance (admin action)
    """
    # Get client
    result = await db.execute(
        select(User).where(User.id == request.user_id, User.role == UserRole.CLIENT)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Get or create balance
    result = await db.execute(
        select(Balance).where(Balance.user_id == client.id)
    )
    balance = result.scalar_one_or_none()
    
    if not balance:
        balance = Balance(user_id=client.id, credits=0)
        db.add(balance)
        await db.flush()
    
    # Add credits
    balance.credits += request.amount
    
    # Create transaction record
    transaction = BalanceTransaction(
        balance_id=balance.id,
        amount=request.amount,
        description=request.description or f"Пополнение администратором (+{request.amount} вынос)",
        order_id=None,
    )
    db.add(transaction)
    
    await db.commit()
    await db.refresh(balance)
    
    return {
        "status": "ok", 
        "message": f"Added {request.amount} credits to {client.name}",
        "new_balance": balance.credits
    }


# ================== SCHEDULER ==================

@router.post("/scheduler/run")
async def run_scheduler():
    """
    Manually trigger the scheduler to generate orders for today.
    This is usually called by a cron job but can be triggered manually.
    """
    try:
        generated, skipped = await generate_orders_for_today()
        return {
            "status": "ok",
            "generated": generated,
            "skipped": skipped,
            "message": f"Generated {generated} orders, skipped {skipped}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scheduler error: {str(e)}"
        )


# ============ TARIFF PRICES MANAGEMENT ============

@router.get("/tariffs")
async def get_tariffs(db: AsyncSession = Depends(get_db)):
    """Get all tariff prices"""
    result = await db.execute(select(TariffPrice).order_by(TariffPrice.id))
    tariffs = result.scalars().all()
    
    return [{
        "id": t.id,
        "tariff_id": t.tariff_id,
        "name": t.name,
        "price": t.price,
        "old_price": t.old_price,
        "period": t.period,
        "description": t.description,
        "is_active": t.is_active,
        "is_urgent": t.is_urgent,
    } for t in tariffs]


@router.put("/tariffs/{tariff_id}")
async def update_tariff(
    tariff_id: str,
    request: TariffPriceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update tariff price and details"""
    result = await db.execute(
        select(TariffPrice).where(TariffPrice.tariff_id == tariff_id)
    )
    tariff = result.scalar_one_or_none()
    
    if not tariff:
        raise HTTPException(status_code=404, detail="Tariff not found")
    
    # Update fields
    if request.name is not None:
        tariff.name = request.name
    if request.price is not None:
        tariff.price = request.price
    if request.old_price is not None:
        tariff.old_price = request.old_price
    if request.period is not None:
        tariff.period = request.period
    if request.description is not None:
        tariff.description = request.description
    if request.is_active is not None:
        tariff.is_active = request.is_active
    if request.is_urgent is not None:
        tariff.is_urgent = request.is_urgent
    
    await db.commit()
    await db.refresh(tariff)
    
    return {
        "status": "ok",
        "tariff": {
            "id": tariff.id,
            "tariff_id": tariff.tariff_id,
            "name": tariff.name,
            "price": tariff.price,
            "old_price": tariff.old_price,
            "period": tariff.period,
            "description": tariff.description,
            "is_active": tariff.is_active,
            "is_urgent": tariff.is_urgent,
        }
    }
