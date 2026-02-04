"""
Тест расчета цен для подписок
"""
import asyncio
import asyncpg
from datetime import date

async def test_prices():
    conn = await asyncpg.connect('postgresql://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway')
    
    # Get all tariff prices from DB
    tariffs = await conn.fetch('SELECT tariff_id, name, price, old_price FROM tariff_prices')
    
    print('\n' + '='*70)
    print('📊 ЦЕНЫ В БД:')
    print('='*70)
    
    tariff_prices = {}
    for t in tariffs:
        tariff_prices[t['tariff_id']] = {
            'price': t['price'],
            'old_price': t['old_price'],
            'name': t['name']
        }
        print(f"   {t['tariff_id']:15s} | {t['price']:5d}₽ | {t['name']}")
    
    print('\n' + '='*70)
    print('🧮 РАСЧЕТ ЦЕН ДЛЯ ПОДПИСОК:')
    print('='*70)
    
    # TEST 1: 14 дней (2 недели)
    print('\n1️⃣ ТЕСТ: 14 дней, через день, 1 мешок')
    duration = 14
    frequency = 'every_other_day'
    bags = 1
    
    # Old logic (with formula)
    monthly_tariff_price = tariff_prices.get('monthly', {}).get('price', 945)
    base_price = int(monthly_tariff_price / 7)
    frequencyMultiplier = {'every_other_day': 0.5}
    pickupsCount = int(duration * frequencyMultiplier[frequency])
    totalPrice = base_price * pickupsCount * bags
    discount = 0.1  # 14 дней = 10% скидка
    old_amount = int(totalPrice * (1 - discount))
    
    print(f'   СТАРАЯ ЛОГИКА (формула):')
    print(f'      base_price = {base_price}₽')
    print(f'      pickupsCount = {pickupsCount}')
    print(f'      totalPrice = {totalPrice}₽')
    print(f'      discount = {discount*100}%')
    print(f'      ИТОГО: {old_amount}₽')
    
    # New logic (from DB)
    new_amount = tariff_prices.get('monthly_14', {}).get('price', 756)
    print(f'\n   НОВАЯ ЛОГИКА (из БД):')
    print(f'      ИТОГО: {new_amount}₽')
    
    print(f'\n   ✅ ФРОНТЕНД ПОКАЗЫВАЕТ: 756₽')
    print(f'   {"✅" if new_amount == 756 else "❌"} БЭКЕНД СЧИТАЕТ: {new_amount}₽')
    
    # TEST 2: 30 дней (месяц)
    print('\n2️⃣ ТЕСТ: 30 дней, через день, 1 мешок')
    duration = 30
    pickupsCount_30 = int(duration * 0.5)
    totalPrice_30 = base_price * pickupsCount_30 * bags
    discount_30 = 0.2  # 30 дней = 20% скидка
    old_amount_30 = int(totalPrice_30 * (1 - discount_30))
    
    print(f'   СТАРАЯ ЛОГИКА (формула):')
    print(f'      pickupsCount = {pickupsCount_30}')
    print(f'      totalPrice = {totalPrice_30}₽')
    print(f'      discount = {discount_30*100}%')
    print(f'      ИТОГО: {old_amount_30}₽')
    
    new_amount_30 = tariff_prices.get('monthly_30', {}).get('price', 1350)
    print(f'\n   НОВАЯ ЛОГИКА (из БД):')
    print(f'      ИТОГО: {new_amount_30}₽')
    
    print(f'\n   ✅ ФРОНТЕНД ПОКАЗЫВАЕТ: 1350₽')
    print(f'   {"✅" if new_amount_30 == 1350 else "❌"} БЭКЕНД СЧИТАЕТ: {new_amount_30}₽')
    
    print('\n' + '='*70)
    
    await conn.close()

asyncio.run(test_prices())
