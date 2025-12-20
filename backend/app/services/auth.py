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
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        # In development, skip verification
        if settings.DEBUG:
            # Parse and return data without verification
            try:
                parsed = dict(parse_qsl(init_data))
                if "user" in parsed:
                    parsed["user"] = json.loads(parsed["user"])
                return parsed
            except:
                return None
        return None
    
    try:
        parsed_data = dict(parse_qsl(init_data))
        
        # Extract hash
        received_hash = parsed_data.pop("hash", None)
        if not received_hash:
            print("Verify Telegram: No hash found in init_data")
            return None
        
        # Create data check string
        data_check_arr = []
        for key in sorted(parsed_data.keys()):
            data_check_arr.append(f"{key}={parsed_data[key]}")
        data_check_string = "\n".join(data_check_arr)
        
        # Create secret key
        secret_key = hmac.new(
            b"WebAppData",
            settings.TELEGRAM_BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Verify
        if calculated_hash != received_hash:
            print(f"Verify Telegram: Hash mismatch. Calculated: {calculated_hash}, Received: {received_hash}")
            return None
        
        # Parse user data
        if "user" in parsed_data:
            parsed_data["user"] = json.loads(parsed_data["user"])
        
        return parsed_data
    
    except Exception as e:
        print(f"Verify Telegram Error: {e}")
        return None

