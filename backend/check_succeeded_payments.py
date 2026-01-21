#!/usr/bin/env python3
"""
Проверка успешных trial платежей
"""
import asyncio
import asyncpg
import json

# Production DB URL
DB_URL = "postgresql://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway"

async def check_succeeded_trials():
    """Check succeeded trial payments"""
    db_url = DB_URL.replace('postgresql+asyncpg://', 'postgresql://')
    
    conn = await asyncpg.connect(db_url)
    
    try:
        print("\n" + "="*60)
        print("✅ УСПЕШНЫЕ TRIAL ПЛАТЕЖИ")
        print("="*60 + "\n")
        
        # Get succeeded trial payments
        payments = await conn.fetch("""
            SELECT id, user_id, amount, yookassa_payment_id, tariff_type, order_data, created_at
            FROM payments
            WHERE status = 'succeeded' AND tariff_type = 'trial'
            ORDER BY id;
        """)
        
        print(f"💰 НАЙДЕНО: {len(payments)}\n")
        
        for payment in payments:
            print(f"Payment #{payment['id']} | User #{payment['user_id']} | {payment['amount']}₽")
            print(f"YooKassa ID: {payment['yookassa_payment_id']}")
            print(f"Создан: {payment['created_at']}")
            
            # Check if subscription was created
            sub = await conn.fetchrow("""
                SELECT id, tariff::text, is_active, start_date, end_date
                FROM subscriptions
                WHERE user_id = $1 AND tariff = 'TRIAL'
            """, payment['user_id'])
            
            if sub:
                print(f"✅ Подписка создана: #{sub['id']} ({sub['tariff']}) | Active: {sub['is_active']}")
            else:
                print(f"❌ ПОДПИСКА НЕ СОЗДАНА!")
            
            # Check order_data
            if payment['order_data']:
                try:
                    order_data = json.loads(payment['order_data'])
                    print(f"📦 order_data: tariff_type={order_data.get('tariff_type')}")
                except:
                    print(f"⚠️  order_data невалидный JSON")
            
            print()
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_succeeded_trials())
