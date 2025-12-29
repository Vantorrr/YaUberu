from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime
from sqlalchemy import Column, DateTime
from sqlalchemy.pool import NullPool

from app.config import settings


class Base(DeclarativeBase):
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=settings.DEBUG,
    poolclass=NullPool,  # Disable connection pooling for Railway
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

