from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.models import get_db, User, Balance
from app.services.auth import create_access_token, verify_telegram_data

router = APIRouter()


class TelegramAuthRequest(BaseModel):
    init_data: str  # Telegram Mini App init data
    name: Optional[str] = None
    phone: Optional[str] = None


class TelegramContactRequest(BaseModel):
    init_data: str  # For validation
    phone: str
    first_name: str
    last_name: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/telegram", response_model=AuthResponse)
async def telegram_auth(
    request: TelegramAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user via Telegram Mini App
    """
    # Verify Telegram init data
    telegram_data = verify_telegram_data(request.init_data)
    if not telegram_data:
        print(f"Telegram Auth Failed: Invalid data. Init data: {request.init_data}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram data"
        )
    
    telegram_id = telegram_data.get("user", {}).get("id")
    if not telegram_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram user ID not found"
        )
    
    # Find or create user
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Create new user
        user = User(
            telegram_id=telegram_id,
            name=request.name or telegram_data.get("user", {}).get("first_name", "User"),
            phone=request.phone,
        )
        db.add(user)
        await db.flush()
        
        # Create balance for new user (GIVE 5 FREE CREDITS)
        balance = Balance(user_id=user.id, credits=5)
        db.add(balance)
        await db.commit()
        await db.refresh(user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "role": user.role.value,
        }
    )


@router.post("/telegram-contact", response_model=AuthResponse)
async def telegram_contact_auth(
    request: TelegramContactRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user via Telegram Web App contact request
    """
    # Verify Telegram init data
    telegram_data = verify_telegram_data(request.init_data)
    if not telegram_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram data"
        )
    
    telegram_id = telegram_data.get("user", {}).get("id")
    if not telegram_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram user ID not found"
        )
    
    # Normalize phone
    phone = request.phone
    if not phone.startswith("+"):
        phone = f"+{phone}"
    
    # Find or create user
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Create new user with contact info
        full_name = request.first_name
        if request.last_name:
            full_name += f" {request.last_name}"
        
        user = User(
            telegram_id=telegram_id,
            name=full_name,
            phone=phone,
        )
        db.add(user)
        await db.flush()
        
        # Create balance for new user (GIVE 5 FREE CREDITS)
        balance = Balance(user_id=user.id, credits=5)
        db.add(balance)
        await db.commit()
        await db.refresh(user)
    else:
        # Update existing user's phone
        user.phone = phone
        user.name = request.first_name + (f" {request.last_name}" if request.last_name else "")
        await db.commit()
        await db.refresh(user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "role": user.role.value,
        }
    )
