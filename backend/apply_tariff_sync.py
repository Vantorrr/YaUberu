#!/usr/bin/env python3
"""Apply tariff sync migration to database"""
import asyncio
from sqlalchemy import text
from app.models import async_session

async def apply_migration():
    async with async_session() as db:
        # Read migration SQL
        with open('migrations/sync_tariffs_with_client.sql', 'r') as f:
            sql = f.read()
        
        # Execute migration
        print("[MIGRATION] Applying tariff sync migration...")
        await db.execute(text(sql))
        await db.commit()
        print("[MIGRATION] ✅ Migration applied successfully!")
        
        # Verify
        result = await db.execute(text("SELECT tariff_id, name, price FROM tariff_prices ORDER BY id"))
        rows = result.fetchall()
        print("\n[MIGRATION] Current tariffs in DB:")
        for row in rows:
            print(f"  - {row[0]}: {row[1]} = {row[2]}₽")

if __name__ == "__main__":
    asyncio.run(apply_migration())

