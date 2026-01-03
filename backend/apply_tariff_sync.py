#!/usr/bin/env python3
"""Apply tariff sync migration to production database"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Production DB URL
DB_URL = "postgresql+asyncpg://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway"

async def apply_migration():
    engine = create_async_engine(DB_URL, echo=True)
    async_session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session_factory() as db:
        # Execute migration in separate statements
        print("[MIGRATION] Applying tariff sync migration...")
        
        # 1. Delete old tariffs
        await db.execute(text("DELETE FROM tariff_prices"))
        print("[MIGRATION] Deleted old tariffs")
        
        # 2. Insert new tariffs (4 tariffs matching client)
        await db.execute(text("""
INSERT INTO tariff_prices (tariff_id, name, price, old_price, period, description, is_active, is_urgent) VALUES
('single', 'Разовый вынос', 139, 250, NULL, 'Заберу мусор в удобное для вас время', TRUE, FALSE),
('trial', 'Первая подписка', 292, 973, '2 недели', 'Две недели будем выносить ваш мусор через день', TRUE, FALSE),
('monthly_14', 'Комфорт 2 недели', 756, NULL, '14 дней', 'Регулярный вынос мусора в течение 14 дней', TRUE, FALSE),
('monthly_30', 'Комфорт месяц', 1460, NULL, '30 дней', 'Регулярный вынос мусора в течение 30 дней', TRUE, FALSE)
        """))
        print("[MIGRATION] Inserted new tariffs")
        
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

