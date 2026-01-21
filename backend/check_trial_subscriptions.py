#!/usr/bin/env python3
"""
Проверка trial подписок в базе данных
"""
import asyncio
import asyncpg

# Production DB URL
DB_URL = "postgresql://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway"

async def check_trial_subscriptions():
    """Check all trial subscriptions in the database"""
    # Parse the URL for asyncpg (remove +asyncpg if present)
    db_url = DB_URL.replace('postgresql+asyncpg://', 'postgresql://')
    
    conn = await asyncpg.connect(db_url)
    
    try:
        print("\n" + "="*60)
        print("🔍 ПРОВЕРКА TRIAL ПОДПИСОК")
        print("="*60 + "\n")
        
        # First check what enum values exist
        enum_query = "SELECT unnest(enum_range(NULL::tariff))::text as tariff_value;"
        try:
            enum_values = await conn.fetch(enum_query)
            print("📋 Доступные значения enum 'tariff':")
            for val in enum_values:
                print(f"   - {val['tariff_value']}")
            print()
        except Exception as e:
            print(f"⚠️  Не удалось получить enum значения: {e}\n")
        
        # Get all subscriptions (simplified)
        query = """
        SELECT 
            s.id as subscription_id,
            s.user_id,
            u.telegram_id,
            s.tariff::text as tariff,
            s.is_active,
            s.start_date,
            s.end_date,
            s.total_credits,
            s.used_credits
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.user_id, s.id;
        """
        
        rows = await conn.fetch(query)
        
        trial_count = 0
        monthly_count = 0
        
        print(f"📦 НАЙДЕНО ПОДПИСОК: {len(rows)}\n")
        
        for row in rows:
            status = "✅ АКТИВНА" if row['is_active'] else "❌ НЕАКТИВНА"
            print(f"Подписка #{row['subscription_id']} - User #{row['user_id']} (TG: {row['telegram_id']})")
            print(f"   Тип: {row['tariff']} | {status}")
            print(f"   📅 Период: {row['start_date']} → {row['end_date']}")
            print(f"   💰 Кредиты: {row['used_credits']}/{row['total_credits']}")
            print()
            
            if row['tariff'] == 'TRIAL':
                trial_count += 1
            elif row['tariff'] == 'MONTHLY':
                monthly_count += 1
        
        print("="*60)
        print(f"📊 ИТОГО:")
        print(f"   TRIAL подписок: {trial_count}")
        print(f"   MONTHLY подписок: {monthly_count}")
        print("="*60 + "\n")
        
        # Check all subscriptions
        all_subs = await conn.fetch("""
            SELECT tariff::text, is_active, COUNT(*) as count
            FROM subscriptions
            GROUP BY tariff, is_active
            ORDER BY tariff, is_active;
        """)
        
        print("\n📋 ВСЕ ПОДПИСКИ В БД:")
        for sub in all_subs:
            status = "активные" if sub['is_active'] else "неактивные"
            print(f"   {sub['tariff']}: {sub['count']} {status}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_trial_subscriptions())
