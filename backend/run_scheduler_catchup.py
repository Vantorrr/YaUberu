#!/usr/bin/env python3
"""
Запуск scheduler для генерации пропущенных заказов
"""
import asyncio
from datetime import date, timedelta
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.scheduler import generate_orders_for_date, generate_orders_for_today

async def catchup_orders():
    """Generate orders for past dates and today"""
    print("\n" + "="*60)
    print("📅 ГЕНЕРАЦИЯ ПРОПУЩЕННЫХ ЗАКАЗОВ")
    print("="*60 + "\n")
    
    # Generate for last 7 days + today
    today = date.today()
    total_generated = 0
    
    for days_ago in range(7, -1, -1):
        target_date = today - timedelta(days=days_ago)
        print(f"\n📆 Генерация для {target_date.strftime('%d.%m.%Y (%A)')}...")
        
        if days_ago == 0:
            # Use generate_orders_for_today for today
            generated, skipped = await generate_orders_for_today()
            print(f"   ✅ Создано: {generated}, Пропущено: {skipped}")
            total_generated += generated
        else:
            # Use generate_orders_for_date for past dates
            generated = await generate_orders_for_date(target_date)
            print(f"   ✅ Создано: {generated}")
            total_generated += generated
    
    print("\n" + "="*60)
    print(f"✅ ГОТОВО! Всего создано заказов: {total_generated}")
    print("="*60 + "\n")

if __name__ == "__main__":
    print("\n⚠️  Это создаст заказы по подпискам за последние 7 дней + сегодня")
    print("Продолжить? (y/n): ", end="")
    response = input()
    if response.lower() == 'y':
        asyncio.run(catchup_orders())
    else:
        print("Отменено.")
