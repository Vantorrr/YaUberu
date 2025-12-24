from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import List, Optional

from app.models import (
    get_db, User, Address, Balance, 
    ResidentialComplex, TrialUsage
)
from app.api.deps import get_current_user

router = APIRouter()


class AddressCreate(BaseModel):
    complex_id: Optional[int] = None
    street: Optional[str] = None
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
    credits: int
    
    class Config:
        from_attributes = True


@router.get("/me")
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user profile
    """
    return {
        "id": current_user.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "role": current_user.role.value,
    }


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's credit balance
    """
    result = await db.execute(
        select(Balance).where(Balance.user_id == current_user.id)
    )
    balance = result.scalar_one_or_none()
    
    if not balance:
        return BalanceResponse(credits=0)
    
    return balance


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
    
    return addresses


@router.post("/addresses", response_model=AddressResponse)
async def create_address(
    request: AddressCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save a new address
    """
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
    
    return address


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
    Get list of available residential complexes
    """
    result = await db.execute(
        select(ResidentialComplex).where(ResidentialComplex.is_active == True)
    )
    complexes = result.scalars().all()
    
    return [{"id": c.id, "name": c.name, "short_name": c.short_name} for c in complexes]
