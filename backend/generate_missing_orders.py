#!/usr/bin/env python3
"""
Generate all missing subscription orders for existing subscriptions
"""
import asyncio
import sys
import os
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from app.models.base import async_session
from app.models import Subscription
from app.services.subscription_orders import generate_all_subscription_orders


async def generate_missing_orders():
    """Generate all missing orders for active subscriptions"""
    print("\n" + "="*60)
    print("📅 ГЕНЕРАЦИЯ ВСЕХ ЗАКАЗОВ ПО ПОДПИСКАМ")
    print("="*60 + "\n")
    
    async with async_session() as db:
        # Get all active subscriptions
        result = await db.execute(
            select(Subscription).where(
                Subscription.is_active == True
            ).order_by(Subscription.id)
        )
        subscriptions = result.scalars().all()
        
        print(f"📦 Найдено активных подписок: {len(subscriptions)}\n")
        
        total_created = 0
        
        for sub in subscriptions:
            print(f"Подписка #{sub.id} (User #{sub.user_id}):")
            print(f"  Период: {sub.start_date} → {sub.end_date}")
            print(f"  Частота: {sub.frequency}")
            print(f"  Кредиты: {sub.used_credits}/{sub.total_credits}")
            
            # Generate all orders starting from subscription start
            created = await generate_all_subscription_orders(
                db=db,
                subscription=sub,
                start_from_date=sub.start_date
            )
            
            print(f"  ✅ Создано заказов: {created}\n")
            total_created += created
        
        await db.commit()
        
        print("="*60)
        print(f"✅ ГОТОВО! Всего создано заказов: {total_created}")
        print("="*60 + "\n")


if __name__ == "__main__":
    print("\n⚠️  Это создаст ВСЕ заказы на весь период подписок")
    print("Продолжить? (y/n): ", end="")
    response = input()
    if response.lower() == 'y':
        asyncio.run(generate_missing_orders())
    else:
        print("Отменено.")
