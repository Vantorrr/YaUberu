#!/usr/bin/env python3
"""
Run scheduler directly on production database
"""
import asyncio
import asyncpg
from datetime import date

# Production DB URL
DB_URL = "postgresql://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway"

async def run_scheduler():
    """Generate orders for today's subscriptions"""
    conn = await asyncpg.connect(DB_URL)
    
    try:
        print("\n" + "="*60)
        print("🚀 ЗАПУСК SCHEDULER (PRODUCTION)")
        print("="*60 + "\n")
        
        today = date.today()
        print(f"📅 Дата: {today.strftime('%d.%m.%Y')}\n")
        
        # Get active subscriptions
        subs = await conn.fetch("""
            SELECT id, user_id, address_id, tariff::text, start_date, end_date,
                   total_credits, used_credits, frequency, default_time_slot::text,
                   last_generated_date
            FROM subscriptions
            WHERE is_active = true AND used_credits < total_credits
            ORDER BY id;
        """)
        
        print(f"📦 Активных подписок: {len(subs)}\n")
        
        generated = 0
        skipped = 0
        
        for sub in subs:
            sub_id = sub['id']
            user_id = sub['user_id']
            frequency = sub['frequency']
            start_date = sub['start_date']
            
            # Check if should generate today
            should_generate = False
            
            if frequency == 'daily':
                should_generate = True
            elif frequency == 'every_other_day':
                if start_date:
                    days_since_start = (today - start_date).days
                    should_generate = (days_since_start % 2 == 0)
            elif frequency == 'twice_week':
                # Use schedule_days (not implemented yet)
                should_generate = False
            
            if not should_generate:
                print(f"⏭️  Sub #{sub_id} (User #{user_id}): не сегодня (день {(today - start_date).days if start_date else '?'})")
                continue
            
            # Check if already generated today
            if sub['last_generated_date'] == today:
                skipped += 1
                print(f"⚠️  Sub #{sub_id} (User #{user_id}): уже создан сегодня")
                continue
            
            # Check balance
            balance_row = await conn.fetchrow(
                "SELECT credits FROM balances WHERE user_id = $1",
                user_id
            )
            
            if not balance_row or balance_row['credits'] <= 0:
                print(f"❌ Sub #{sub_id} (User #{user_id}): нет кредитов на балансе")
                continue
            
            # Create order
            order_id = await conn.fetchval("""
                INSERT INTO orders (
                    user_id, address_id, date, time_slot, status,
                    is_subscription, subscription_id, comment, bags_count
                ) VALUES (
                    $1, $2, $3, $4, 'SCHEDULED',
                    true, $5, 'Авто-заказ по подписке', 1
                ) RETURNING id;
            """,
                user_id,
                sub['address_id'],
                today,
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
                SELECT id, -1, $1, $2
                FROM balances WHERE user_id = $3;
            """,
                f"Авто-заказ по подписке #{order_id}",
                order_id,
                user_id
            )
            
            # Update subscription
            await conn.execute("""
                UPDATE subscriptions
                SET last_generated_date = $1,
                    used_credits = used_credits + 1,
                    is_active = CASE 
                        WHEN used_credits + 1 >= total_credits THEN false 
                        ELSE true 
                    END
                WHERE id = $2;
            """,
                today,
                sub_id
            )
            
            generated += 1
            print(f"✅ Sub #{sub_id} (User #{user_id}): создан заказ #{order_id}")
        
        print("\n" + "="*60)
        print(f"✅ РЕЗУЛЬТАТ:")
        print(f"   Создано: {generated}")
        print(f"   Пропущено: {skipped}")
        print("="*60 + "\n")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_scheduler())
