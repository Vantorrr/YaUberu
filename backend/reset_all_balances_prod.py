"""
RESET ALL BALANCES - Production Clean Slate
============================================
Обнуляет все балансы клиентов (выносы по подписке + разовые)
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()


async def reset_all_balances():
    """
    Полный сброс всех балансов
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
        print("🚨 НАЧИНАЮ СБРОС ВСЕХ БАЛАНСОВ...")
        print("=" * 60)
        
        # 1. Показываем текущее состояние
        balances = await conn.fetch("""
            SELECT 
                u.id,
                u.name,
                b.credits,
                b.single_credits
            FROM users u
            LEFT JOIN balances b ON b.user_id = u.id
            WHERE u.role = 'CLIENT' AND (b.credits > 0 OR b.single_credits > 0)
        """)
        
        print(f"\n📊 ТЕКУЩИЕ БАЛАНСЫ:")
        if balances:
            for bal in balances:
                print(f"   👤 {bal['name']}: подписка={bal['credits']}, разовые={bal['single_credits']}")
        else:
            print("   (Все балансы уже обнулены)")
        
        # 2. Обнуляем все балансы
        print(f"\n🗑️  Обнуляю все балансы...")
        
        result = await conn.execute("""
            UPDATE balances 
            SET credits = 0, single_credits = 0
            WHERE credits > 0 OR single_credits > 0
        """)
        
        print(f"   ✅ Обнулено записей: {result.split()[-1]}")
        
        # 3. Проверка
        print(f"\n💯 ПРОВЕРКА:")
        remaining = await conn.fetch("""
            SELECT 
                u.name,
                b.credits,
                b.single_credits
            FROM users u
            LEFT JOIN balances b ON b.user_id = u.id
            WHERE u.role = 'CLIENT' AND (b.credits > 0 OR b.single_credits > 0)
        """)
        
        if remaining:
            print("   ⚠️  Остались ненулевые балансы:")
            for r in remaining:
                print(f"      {r['name']}: {r['credits']} / {r['single_credits']}")
        else:
            print("   ✅ Все балансы = 0")
        
        print("\n" + "=" * 60)
        print("✅ СБРОС БАЛАНСОВ ЗАВЕРШЕН!")
        print("🎉 Теперь можно выходить в прод с чистого листа!")
        
    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(reset_all_balances())
