import hashlib
import hmac
import json
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import parse_qsl

from jose import jwt

from app.config import settings


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt


def verify_telegram_data(init_data: str) -> Optional[dict]:
    """
    Verify Telegram Mini App init data
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    
    PRODUCTION MODE: Strict verification required!
    """
    # PRODUCTION: Token is REQUIRED
    if not settings.TELEGRAM_BOT_TOKEN:
        print("[AUTH] CRITICAL: TELEGRAM_BOT_TOKEN not set! Auth blocked.")
        return None
    
    try:
        parsed_data = dict(parse_qsl(init_data))
        
        # Extract hash
        received_hash = parsed_data.pop("hash", None)
        if not received_hash:
            print("[AUTH] No hash found in init_data")
            return None
        
        # Create data check string (sorted keys)
        data_check_arr = []
        for key in sorted(parsed_data.keys()):
            data_check_arr.append(f"{key}={parsed_data[key]}")
        data_check_string = "\n".join(data_check_arr)
        
        # Create secret key using HMAC-SHA256
        secret_key = hmac.new(
            b"WebAppData",
            settings.TELEGRAM_BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        # Calculate expected hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Constant-time comparison to prevent timing attacks
        if not hmac.compare_digest(calculated_hash, received_hash):
            print(f"[AUTH] Hash mismatch!")
            print(f"[AUTH] Calculated: {calculated_hash[:16]}...")
            print(f"[AUTH] Received:   {received_hash[:16]}...")
            return None
        
        # Parse user data
        if "user" in parsed_data:
            parsed_data["user"] = json.loads(parsed_data["user"])
        
        print(f"[AUTH] Verified user: {parsed_data.get('user', {}).get('id')}")
        return parsed_data
    
    except Exception as e:
        print(f"[AUTH] Verification error: {e}")
        return None


def is_admin(telegram_id: int) -> bool:
    """Check if user is admin"""
    return telegram_id in settings.admin_ids
