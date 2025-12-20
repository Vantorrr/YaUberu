from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    BOT_TOKEN: str = ""
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ya_uberu"
    
    # Admin IDs for courier management
    ADMIN_IDS: list = []

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

