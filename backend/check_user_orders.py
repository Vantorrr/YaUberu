#!/usr/bin/env python3
"""
Проверка заказов и платежей пользователя
"""
import asyncio
import asyncpg

# Production DB URL
DB_URL = "postgresql://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway"

async def check_user_data(user_id=1):
    """Check user orders and payments"""
    db_url = DB_URL.replace('postgresql+asyncpg://', 'postgresql://')
    
    conn = await asyncpg.connect(db_url)
    
    try:
        print("\n" + "="*60)
        print(f"🔍 ПРОВЕРКА ДАННЫХ USER #{user_id}")
        print("="*60 + "\n")
        
        # Get user info
        user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        print(f"👤 User: TG {user['telegram_id']}, Role: {user['role']}")
        print()
        
        # Get balance
        balance = await conn.fetchrow("SELECT * FROM balances WHERE user_id = $1", user_id)
        if balance:
            print(f"💰 Баланс: {balance['credits']} кредитов")
        print()
        
        # Get all orders
        orders = await conn.fetch("""
            SELECT id, date, time_slot, status, bags_count, is_subscription, subscription_id, created_at
            FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC;
        """, user_id)
        
        print(f"📦 ЗАКАЗЫ ({len(orders)}):")
        for order in orders:
            sub_marker = f" [SUB #{order['subscription_id']}]" if order['is_subscription'] else ""
            print(f"   Order #{order['id']}: {order['date']} {order['time_slot']} | {order['status']}{sub_marker}")
            print(f"   Создан: {order['created_at']}, Мешков: {order['bags_count']}")
        print()
        
        # Get balance transactions
        transactions = await conn.fetch("""
            SELECT amount, description, created_at
            FROM balance_transactions
            WHERE balance_id = $1
            ORDER BY created_at DESC
            LIMIT 20;
        """, balance['id'] if balance else 0)
        
        print(f"💳 ТРАНЗАКЦИИ ({len(transactions)}):")
        for tx in transactions:
            sign = "+" if tx['amount'] > 0 else ""
            print(f"   {sign}{tx['amount']} | {tx['description']} | {tx['created_at']}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_user_data(1))
