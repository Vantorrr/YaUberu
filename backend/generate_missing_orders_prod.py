#!/usr/bin/env python3
"""
Generate all missing subscription orders - direct PostgreSQL connection
"""
import asyncio
import asyncpg
from datetime import date, timedelta

# Production DB URL
DB_URL = "postgresql://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway"


async def generate_missing_orders():
    """Generate all missing orders for active subscriptions"""
    conn = await asyncpg.connect(DB_URL)
    
    try:
        print("\n" + "="*60)
        print("📅 ГЕНЕРАЦИЯ ВСЕХ ЗАКАЗОВ ПО ПОДПИСКАМ")
        print("="*60 + "\n")
        
        # Get all active subscriptions
        subs = await conn.fetch("""
            SELECT id, user_id, address_id, tariff::text, start_date, end_date,
                   total_credits, used_credits, frequency, default_time_slot::text
            FROM subscriptions
            WHERE is_active = true
            ORDER BY id;
        """)
        
        print(f"📦 Найдено активных подписок: {len(subs)}\n")
        
        total_created = 0
        
        for sub in subs:
            sub_id = sub['id']
            user_id = sub['user_id']
            start_date = sub['start_date']
            end_date = sub['end_date']
            frequency = sub['frequency']
            
            print(f"Подписка #{sub_id} (User #{user_id}, {sub['tariff']}):")
            print(f"  Период: {start_date} → {end_date}")
            print(f"  Частота: {frequency}")
            print(f"  Кредиты: {sub['used_credits']}/{sub['total_credits']}")
            
            # Calculate all expected dates
            expected_dates = []
            current = start_date
            
            while current <= end_date:
                days_from_start = (current - start_date).days
                
                if frequency == 'daily':
                    expected_dates.append(current)
                elif frequency == 'every_other_day':
                    if days_from_start % 2 == 0:
                        expected_dates.append(current)
                
                current += timedelta(days=1)
            
            # Get existing orders
            existing = await conn.fetch("""
                SELECT date FROM orders
                WHERE subscription_id = $1;
            """, sub_id)
            existing_dates = {row['date'] for row in existing}
            
            # Get balance
            balance_row = await conn.fetchrow(
                "SELECT id, credits FROM balances WHERE user_id = $1",
                user_id
            )
            
            if not balance_row:
                print(f"  ❌ Нет баланса!")
                continue
            
            balance_id = balance_row['id']
            current_balance = balance_row['credits']
            
            # Create missing orders
            created = 0
            
            for order_date in expected_dates:
                if order_date in existing_dates:
                    continue  # Already exists
                
                # Check credits
                remaining = sub['total_credits'] - sub['used_credits'] - created
                if remaining <= 0:
                    print(f"  ⚠️  Нет кредитов (осталось {remaining})")
                    break
                
                # Create order
                order_id = await conn.fetchval("""
                    INSERT INTO orders (
                        user_id, address_id, date, time_slot, status,
                        is_subscription, subscription_id, bags_count, comment
                    ) VALUES (
                        $1, $2, $3, $4, 'SCHEDULED',
                        true, $5, 1, 'Авто-заказ по подписке'
                    ) RETURNING id;
                """,
                    user_id,
                    sub['address_id'],
                    order_date,
                    sub['default_time_slot'] or 'DAY',
                    sub_id
                )
                
                # Deduct credit
                await conn.execute(
                    "UPDATE balances SET credits = credits - 1 WHERE user_id = $1",
                    user_id
                )
                
                # Log transaction
                await conn.execute("""
                    INSERT INTO balance_transactions (balance_id, amount, description, order_id)
                    VALUES ($1, -1, $2, $3);
                """,
                    balance_id,
                    f"Авто-заказ по подписке #{order_id} на {order_date.strftime('%d.%m')}",
                    order_id
                )
                
                created += 1
                print(f"  ✅ Order #{order_id} на {order_date.strftime('%d.%m')}")
            
            # Update subscription
            new_used = sub['used_credits'] + created
            new_active = (new_used < sub['total_credits'])
            
            await conn.execute("""
                UPDATE subscriptions
                SET used_credits = $1, is_active = $2
                WHERE id = $3;
            """,
                new_used,
                new_active,
                sub_id
            )
            
            print(f"  📊 Создано: {created} заказов\n")
            total_created += created
        
        print("="*60)
        print(f"✅ ГОТОВО! Всего создано заказов: {total_created}")
        print("="*60 + "\n")
        
    finally:
        await conn.close()


if __name__ == "__main__":
    print("\n⚠️  Это создаст ВСЕ заказы на весь период подписок")
    print("Продолжить? (y/n): ", end="")
    response = input()
    if response.lower() == 'y':
        asyncio.run(generate_missing_orders())
    else:
        print("Отменено.")
