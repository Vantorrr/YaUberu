from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import List, Optional

from app.models import (
    get_db, User, Address, Balance, 
    ResidentialComplex, TrialUsage, Order
)
from sqlalchemy import func
from app.api.deps import get_current_user

router = APIRouter()


class AddressCreate(BaseModel):
    street: str  # Street is required
    complex_id: Optional[int] = None
    building: str
    entrance: Optional[str] = None
    floor: Optional[str] = None
    apartment: str
    intercom: Optional[str] = None
    is_default: bool = True


class AddressResponse(BaseModel):
    id: int
    complex_name: Optional[str]
    street: Optional[str]
    building: str
    entrance: Optional[str]
    floor: Optional[str]
    apartment: str
    intercom: Optional[str]
    is_default: bool
    
    class Config:
        from_attributes = True


class BalanceResponse(BaseModel):
    credits: int  # Subscription credits (trial/monthly)
    single_credits: int  # Single pickup credits (flexible rescheduling)
    
    class Config:
        from_attributes = True


@router.get("/me")
async def get_current_user_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user profile with is_new_user flag
    """
    # Count user's orders to determine if they are new
    result = await db.execute(
        select(func.count(Order.id)).where(Order.user_id == current_user.id)
    )
    orders_count = result.scalar() or 0
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "role": current_user.role.value,
        "is_new_user": orders_count == 0,  # TRUE if 0 orders, FALSE otherwise
    }


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's credit balance (subscription + single pickups)
    """
    result = await db.execute(
        select(Balance).where(Balance.user_id == current_user.id)
    )
    balance = result.scalar_one_or_none()
    
    if not balance:
        return BalanceResponse(credits=0, single_credits=0)
    
    return balance


@router.get("/subscriptions")
async def get_user_subscriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's active subscriptions (auto-deactivates expired ones)
    """
    from app.models import Subscription
    from datetime import date
    
    today = date.today()
    
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.is_active == True
        )
    )
    subscriptions = result.scalars().all()
    
    # Auto-deactivate expired subscriptions
    for s in subscriptions:
        if s.end_date and s.end_date < today:
            print(f"[SUBSCRIPTIONS] Deactivating expired subscription #{s.id} (ended {s.end_date})")
            s.is_active = False
    
    await db.commit()
    
    # Return only active and not expired
    active_subs = [s for s in subscriptions if s.is_active and (not s.end_date or s.end_date >= today)]
    
    return [{
        "id": s.id,
        "tariff": s.tariff.value,
        "start_date": s.start_date.isoformat() if s.start_date else None,
        "end_date": s.end_date.isoformat() if s.end_date else None,
        "frequency": s.frequency,  # Already a string, not enum
        "is_active": s.is_active
    } for s in active_subs]


@router.get("/me/has-trial")
async def check_has_trial_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if user has ever purchased a trial subscription (active or inactive)
    """
    from app.models import Subscription, Tariff
    
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.tariff == Tariff.TRIAL
        ).limit(1)
    )
    trial_subscription = result.scalar_one_or_none()
    
    return {"has_trial": trial_subscription is not None}


@router.get("/addresses", response_model=List[AddressResponse])
async def get_addresses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's saved addresses
    """
    result = await db.execute(
        select(Address).where(Address.user_id == current_user.id)
    )
    addresses = result.scalars().all()
    
    # Format response with complex_name
    response = []
    for addr in addresses:
        complex_name = None
        if addr.complex_id:
            complex_result = await db.execute(
                select(ResidentialComplex).where(ResidentialComplex.id == addr.complex_id)
            )
            complex_obj = complex_result.scalar_one_or_none()
            if complex_obj:
                complex_name = complex_obj.name
        
        response.append(AddressResponse(
            id=addr.id,
            complex_name=complex_name,
            street=addr.street if hasattr(addr, 'street') else None,
            building=addr.building,
            entrance=addr.entrance,
            floor=addr.floor,
            apartment=addr.apartment,
            intercom=addr.intercom,
            is_default=addr.is_default
        ))
    
    return response


@router.post("/addresses", response_model=AddressResponse)
async def create_address(
    request: AddressCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save a new address
    """
    complex_name = None
    
    # Verify complex exists (if provided)
    if request.complex_id:
        result = await db.execute(
            select(ResidentialComplex).where(ResidentialComplex.id == request.complex_id)
        )
        complex = result.scalar_one_or_none()
        
        if not complex:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Residential complex not found"
            )
        complex_name = complex.name
    
    # If this is default, unset other defaults
    if request.is_default:
        result = await db.execute(
            select(Address).where(
                and_(Address.user_id == current_user.id, Address.is_default == True)
            )
        )
        existing_defaults = result.scalars().all()
        for addr in existing_defaults:
            addr.is_default = False
    
    address = Address(
        user_id=current_user.id,
        complex_id=request.complex_id,
        street=request.street,
        building=request.building,
        entrance=request.entrance,
        floor=request.floor,
        apartment=request.apartment,
        intercom=request.intercom,
        is_default=request.is_default,
    )
    db.add(address)
    await db.commit()
    await db.refresh(address)
    
    # Return formatted response
    return AddressResponse(
        id=address.id,
        complex_name=complex_name,
        street=address.street,
        building=address.building,
        entrance=address.entrance,
        floor=address.floor,
        apartment=address.apartment,
        intercom=address.intercom,
        is_default=address.is_default
    )


@router.get("/can-use-trial")
async def check_trial_eligibility(
    complex_id: int,
    building: str,
    apartment: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Check if trial subscription is available for this apartment
    (Anti-fraud: one trial per apartment)
    """
    result = await db.execute(
        select(TrialUsage).where(
            and_(
                TrialUsage.complex_id == complex_id,
                TrialUsage.building == building,
                TrialUsage.apartment == apartment,
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    return {"can_use_trial": existing is None}


@router.get("/complexes")
async def get_residential_complexes(
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of available residential complexes with buildings
    """
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(ResidentialComplex)
        .where(ResidentialComplex.is_active == True)
        .options(selectinload(ResidentialComplex.buildings))
    )
    complexes = result.scalars().all()
    
    return [{
        "id": c.id, 
        "name": c.name, 
        "short_name": c.short_name,
        "buildings": [b.building_number for b in c.buildings]
    } for c in complexes]
