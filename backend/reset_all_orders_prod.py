"""
RESET ALL ORDERS - Production Clean Slate
===========================================
Полностью очищает все заказы, транзакции и восстанавливает балансы
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def reset_all_orders():
    """
    Полный сброс заказов и балансов
    """
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL not set")
    
    # Parse PostgreSQL URL
    url = DATABASE_URL
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "")
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "")
    
    # Extract credentials
    # Format: user:password@host:port/database
    parts = url.split("@")
    user_pass = parts[0]
    host_port_db = parts[1]
    
    user, password = user_pass.split(":")
    host_port, database = host_port_db.split("/")
    host, port = host_port.split(":")
    
    conn = await asyncpg.connect(
        user=user,
        password=password,
        database=database,
        host=host,
        port=int(port)
    )
    
    try:
        print("🚨 НАЧИНАЮ ПОЛНЫЙ СБРОС...")
        print("=" * 60)
        
        # 1. Подсчет перед удалением
        orders_count = await conn.fetchval("SELECT COUNT(*) FROM orders")
        transactions_count = await conn.fetchval("SELECT COUNT(*) FROM balance_transactions")
        print(f"\n📊 ТЕКУЩЕЕ СОСТОЯНИЕ:")
        print(f"   Заказов: {orders_count}")
        print(f"   Транзакций: {transactions_count}")
        
        # 2. Удаление всех транзакций СНАЧАЛА (foreign key)
        print(f"\n🗑️  Удаляю все {transactions_count} транзакций...")
        await conn.execute("DELETE FROM balance_transactions")
        print("   ✅ Все транзакции удалены")
        
        # 3. Удаление всех заказов
        print(f"\n🗑️  Удаляю все {orders_count} заказов...")
        await conn.execute("DELETE FROM orders")
        print("   ✅ Все заказы удалены")
        
        # 4. Сброс used_credits в подписках
        print(f"\n🔄 Сбрасываю used_credits в подписках...")
        subscriptions = await conn.fetch("SELECT id, total_credits, used_credits FROM subscriptions")
        for sub in subscriptions:
            print(f"   Подписка #{sub['id']}: used_credits {sub['used_credits']} → 0")
        
        await conn.execute("UPDATE subscriptions SET used_credits = 0")
        print("   ✅ Все used_credits = 0")
        
        # 5. Восстановление балансов
        print(f"\n💰 Восстанавливаю балансы клиентов...")
        
        # Получаем всех пользователей с их активными подписками
        users_with_subs = await conn.fetch("""
            SELECT 
                u.id as user_id,
                u.name,
                b.credits as current_credits,
                b.single_credits,
                COALESCE(SUM(s.total_credits - s.used_credits), 0) as total_remaining_credits
            FROM users u
            LEFT JOIN balances b ON b.user_id = u.id
            LEFT JOIN subscriptions s ON s.user_id = u.id AND s.is_active = true
            WHERE u.role = 'CLIENT'
            GROUP BY u.id, u.name, b.credits, b.single_credits
        """)
        
        for user in users_with_subs:
            new_credits = int(user['total_remaining_credits'])
            old_credits = user['current_credits'] or 0
            
            if new_credits != old_credits:
                await conn.execute(
                    "UPDATE balances SET credits = $1 WHERE user_id = $2",
                    new_credits, user['user_id']
                )
                print(f"   👤 {user['name']}: баланс {old_credits} → {new_credits}")
        
        print("\n" + "=" * 60)
        print("✅ СБРОС ЗАВЕРШЕН!")
        print("\n📊 ИТОГОВОЕ СОСТОЯНИЕ:")
        
        final_orders = await conn.fetchval("SELECT COUNT(*) FROM orders")
        final_transactions = await conn.fetchval("SELECT COUNT(*) FROM balance_transactions")
        active_subs = await conn.fetchval("SELECT COUNT(*) FROM subscriptions WHERE is_active = true")
        
        print(f"   Заказов: {final_orders}")
        print(f"   Транзакций: {final_transactions}")
        print(f"   Активных подписок: {active_subs}")
        print(f"   Пользователей: {len(users_with_subs)}")
        print("\n🎉 Система готова к работе с чистого листа!")
        
    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(reset_all_orders())
