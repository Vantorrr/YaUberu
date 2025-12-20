import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from app.models.base import Base, engine, async_session
from app.models import ResidentialComplex

async def init():
    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    print("Checking data...")
    async with async_session() as session:
        # Check if complex exists
        from sqlalchemy import select
        result = await session.execute(select(ResidentialComplex))
        complex = result.scalar_one_or_none()
        
        if not complex:
            print("Creating ЖК Маяк...")
            c1 = ResidentialComplex(name="ЖК Маяк", short_name="Маяк", is_active=True)
            c2 = ResidentialComplex(name="ЖК Центральный", short_name="Центр", is_active=True)
            session.add_all([c1, c2])
            await session.commit()
            print("Complexes created.")
        else:
            print("Data already exists.")

if __name__ == "__main__":
    asyncio.run(init())
