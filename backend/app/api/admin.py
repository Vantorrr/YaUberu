from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

from app.models import (
    get_db, User, UserRole, Order, OrderStatus,
    ResidentialComplex, Subscription, Balance, BalanceTransaction
)
from app.services.scheduler import generate_orders_for_today

router = APIRouter()


class ComplexCreate(BaseModel):
    name: str
    short_name: Optional[str] = None


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
    Add a new residential complex
    """
    complex = ResidentialComplex(
        name=request.name,
        short_name=request.short_name or request.name[:10],
    )
    db.add(complex)
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
    result = await db.execute(select(ResidentialComplex))
    complexes = result.scalars().all()
    
    return [{"id": c.id, "name": c.name, "short_name": c.short_name, "is_active": c.is_active} for c in complexes]


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
