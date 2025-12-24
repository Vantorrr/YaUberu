from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./sql_app.db"
    
    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Telegram Bots
    TELEGRAM_BOT_TOKEN: str = ""  # Client bot token (@YaUberu_AppBot)
    TELEGRAM_COURIER_BOT_TOKEN: str = ""  # Courier bot token (@YaUberu_TeamBot)
    TELEGRAM_BOT_USERNAME: str = "YaUberu_AppBot"
    
    # Frontend
    FRONTEND_URL: str = "https://ya-uberu-frontend.up.railway.app"
    
    # Admin
    ADMIN_TELEGRAM_IDS: str = "8141463258,574160946,622899263"  # Comma-separated admin Telegram IDs
    
    # Support
    SUPPORT_USERNAME: str = "@YaUberu_Support"
    SUPPORT_PHONE: str = "+7 (999) 123-45-67"
    
    # App
    APP_NAME: str = "Я УБЕРУ"
    DEBUG: bool = False  # PRODUCTION MODE - strict verification!
    
    # CORS
    ALLOWED_ORIGINS: str = "*"  # For production: "https://ya-uberu-frontend.up.railway.app"

    class Config:
        env_file = ".env"
    
    @property
    def admin_ids(self) -> list:
        """Parse admin IDs from comma-separated string"""
        if not self.ADMIN_TELEGRAM_IDS:
            return []
        return [int(id.strip()) for id in self.ADMIN_TELEGRAM_IDS.split(",") if id.strip()]

@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    
    # Auto-fix Railway DATABASE_URL for asyncpg
    if settings.DATABASE_URL and settings.DATABASE_URL.startswith("postgresql://"):
        settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        
    return settings

settings = get_settings()
