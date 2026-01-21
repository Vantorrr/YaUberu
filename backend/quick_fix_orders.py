#!/usr/bin/env python3
"""Quick fix - create missing orders for subscription #4"""
import asyncio
import asyncpg
from datetime import date

DB_URL = "postgresql://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway"

async def quick_fix():
    conn = await asyncpg.connect(DB_URL)
    
    print('\n🚀 Создаю заказы для подписки #4...\n')
    
    # Dates: 23, 25, 27, 29, 31 января
    dates_data = [
        (date(2026, 1, 23), 4, 2),  # user_id=4, address_id=2
        (date(2026, 1, 25), 4, 2),
        (date(2026, 1, 27), 4, 2),
        (date(2026, 1, 29), 4, 2),
        (date(2026, 1, 31), 4, 2),
    ]
    
    balance_id = await conn.fetchval('SELECT id FROM balances WHERE user_id = 4')
    
    for order_date, user_id, address_id in dates_data:
        # Create order
        order_id = await conn.fetchval('''
            INSERT INTO orders (user_id, address_id, date, time_slot, status, is_subscription, subscription_id, bags_count, comment)
            VALUES ($1, $2, $3, 'DAY', 'SCHEDULED', true, 4, 1, 'Авто-заказ по подписке')
            RETURNING id;
        ''', user_id, address_id, order_date)
        
        # Deduct credit
        await conn.execute('UPDATE balances SET credits = credits - 1 WHERE user_id = $1', user_id)
        
        # Transaction
        await conn.execute('''
            INSERT INTO balance_transactions (balance_id, amount, description, order_id)
            VALUES ($1, -1, $2, $3);
        ''', balance_id, f'Заказ #{order_id} на {order_date.strftime("%d.%m")}', order_id)
        
        print(f'✅ Order #{order_id} на {order_date.strftime("%d.%m")}')
    
    # Update subscription
    await conn.execute('UPDATE subscriptions SET used_credits = 6, is_active = true WHERE id = 4')
    
    print('\n✅ Готово! Создано 5 заказов для User #4')
    await conn.close()

asyncio.run(quick_fix())
