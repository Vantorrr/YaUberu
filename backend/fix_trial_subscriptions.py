#!/usr/bin/env python3
"""
Создать trial подписки для успешных платежей где их нет
"""
import asyncio
import asyncpg
import json
from datetime import date, timedelta

# Production DB URL
DB_URL = "postgresql://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway"

async def fix_trial_subscriptions():
    """Create missing trial subscriptions for succeeded payments"""
    db_url = DB_URL.replace('postgresql+asyncpg://', 'postgresql://')
    
    conn = await asyncpg.connect(db_url)
    
    try:
        print("\n" + "="*60)
        print("🔧 ИСПРАВЛЕНИЕ TRIAL ПОДПИСОК")
        print("="*60 + "\n")
        
        # Get succeeded trial payments without subscriptions
        payments = await conn.fetch("""
            SELECT p.id, p.user_id, p.order_data
            FROM payments p
            WHERE p.status = 'succeeded' 
              AND p.tariff_type = 'trial'
              AND NOT EXISTS (
                  SELECT 1 FROM subscriptions s 
                  WHERE s.user_id = p.user_id AND s.tariff = 'TRIAL'
              )
            ORDER BY p.id;
        """)
        
        print(f"💰 Найдено платежей без подписки: {len(payments)}\n")
        
        if len(payments) == 0:
            print("✅ Все в порядке! Нечего исправлять.\n")
            return
        
        for payment in payments:
            print(f"Processing Payment #{payment['id']} for User #{payment['user_id']}...")
            
            # Parse order data
            order_data = json.loads(payment['order_data'])
            address_id = order_data.get('address_id')
            time_slot = 'DAY'  # Default time slot for trial subscriptions
            
            # Create subscription
            insert_query = """
            INSERT INTO subscriptions (
                user_id, address_id, tariff, total_credits, used_credits,
                schedule_days, default_time_slot, is_active,
                start_date, end_date, frequency
            ) VALUES (
                $1, $2, 'TRIAL', 7, 0,
                '1,3,5', $3, true,
                $4, $5, 'every_other_day'
            ) RETURNING id;
            """
            
            start_date = date.today()
            end_date = start_date + timedelta(days=14)
            
            sub_id = await conn.fetchval(
                insert_query,
                payment['user_id'],
                address_id,
                time_slot,
                start_date,
                end_date
            )
            
            print(f"✅ Создана подписка #{sub_id} для User #{payment['user_id']}\n")
        
        print("="*60)
        print(f"✅ ГОТОВО! Создано подписок: {len(payments)}")
        print("="*60)
        
    finally:
        await conn.close()

if __name__ == "__main__":
    print("\n⚠️  ВНИМАНИЕ: Этот скрипт создаст trial подписки для успешных платежей.")
    print("Продолжить? (y/n): ", end="")
    response = input()
    if response.lower() == 'y':
        asyncio.run(fix_trial_subscriptions())
    else:
        print("Отменено.")
