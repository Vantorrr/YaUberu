#!/usr/bin/env python3
"""
Удалить дублирующие trial подписки (оставить только самую раннюю)
"""
import asyncio
import asyncpg

# Production DB URL
DB_URL = "postgresql://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway"

async def remove_duplicate_trials():
    """Remove duplicate trial subscriptions, keep only the first one per user"""
    db_url = DB_URL.replace('postgresql+asyncpg://', 'postgresql://')
    
    conn = await asyncpg.connect(db_url)
    
    try:
        print("\n" + "="*60)
        print("🧹 УДАЛЕНИЕ ДУБЛИРУЮЩИХ TRIAL ПОДПИСОК")
        print("="*60 + "\n")
        
        # Find users with multiple trial subscriptions
        duplicates = await conn.fetch("""
            SELECT user_id, COUNT(*) as count
            FROM subscriptions
            WHERE tariff = 'TRIAL'
            GROUP BY user_id
            HAVING COUNT(*) > 1;
        """)
        
        print(f"👥 Найдено пользователей с дубликатами: {len(duplicates)}\n")
        
        if len(duplicates) == 0:
            print("✅ Нет дубликатов!\n")
            return
        
        total_deleted = 0
        
        for dup in duplicates:
            user_id = dup['user_id']
            count = dup['count']
            
            print(f"User #{user_id}: {count} trial подписок")
            
            # Get all trial subscriptions for this user
            subs = await conn.fetch("""
                SELECT id, start_date
                FROM subscriptions
                WHERE user_id = $1 AND tariff = 'TRIAL'
                ORDER BY id;
            """, user_id)
            
            # Keep the first one, delete the rest
            keep_id = subs[0]['id']
            delete_ids = [s['id'] for s in subs[1:]]
            
            print(f"  ✅ Оставляем: #{keep_id}")
            print(f"  ❌ Удаляем: {delete_ids}")
            
            # Delete duplicates
            for sub_id in delete_ids:
                await conn.execute("DELETE FROM subscriptions WHERE id = $1", sub_id)
                total_deleted += 1
            
            print()
        
        print("="*60)
        print(f"✅ ГОТОВО! Удалено подписок: {total_deleted}")
        print("="*60)
        
    finally:
        await conn.close()

if __name__ == "__main__":
    print("\n⚠️  ВНИМАНИЕ: Этот скрипт удалит дублирующие trial подписки.")
    print("Продолжить? (y/n): ", end="")
    response = input()
    if response.lower() == 'y':
        asyncio.run(remove_duplicate_trials())
    else:
        print("Отменено.")
