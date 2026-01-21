#!/usr/bin/env python3
"""
Проверка платежей в БД
"""
import asyncio
import asyncpg

# Production DB URL
DB_URL = "postgresql://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway"

async def check_payments():
    """Check all payments"""
    db_url = DB_URL.replace('postgresql+asyncpg://', 'postgresql://')
    
    conn = await asyncpg.connect(db_url)
    
    try:
        print("\n" + "="*60)
        print("💳 ПРОВЕРКА ПЛАТЕЖЕЙ")
        print("="*60 + "\n")
        
        # Get all payments (check what columns exist first)
        try:
            payments = await conn.fetch("""
                SELECT *
                FROM payments
                ORDER BY created_at DESC
                LIMIT 50;
            """)
        except Exception as e:
            print(f"❌ Ошибка при получении платежей: {e}")
            payments = []
        
        print(f"💰 НАЙДЕНО ПЛАТЕЖЕЙ: {len(payments)}\n")
        
        if payments:
            # Show first payment structure
            print(f"📋 Колонки в таблице: {list(payments[0].keys())}\n")
        
        for payment in payments:
            payment_dict = dict(payment)
            status = payment_dict.get('status', 'unknown')
            status_icon = {
                'pending': '⏳',
                'succeeded': '✅',
                'canceled': '❌',
                'failed': '💥'
            }.get(status, '❓')
            
            print(f"{status_icon} Payment #{payment_dict.get('id')}")
            print(f"   User: #{payment_dict.get('user_id')}")
            print(f"   Сумма: {payment_dict.get('amount')}₽")
            if 'tariff_type' in payment_dict:
                print(f"   Тип: {payment_dict.get('tariff_type') or 'single'}")
            if 'yookassa_payment_id' in payment_dict:
                print(f"   YooKassa ID: {payment_dict.get('yookassa_payment_id')}")
            print(f"   Создан: {payment_dict.get('created_at')}")
            print()
        
        # Summary by status
        summary = await conn.fetch("""
            SELECT status, COUNT(*) as count
            FROM payments
            GROUP BY status;
        """)
        
        print("="*60)
        print("📊 СТАТИСТИКА:")
        for row in summary:
            print(f"   {row['status']}: {row['count']}")
        print("="*60)
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_payments())
