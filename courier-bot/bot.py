import asyncio
import logging
import os
import aiohttp
from datetime import datetime
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_BASE = os.getenv("API_BASE_URL", "http://localhost:8080/api")

# Admin IDs from environment
ADMIN_IDS_STR = os.getenv("ADMIN_TELEGRAM_IDS", "8141463258,574160946,622899263")
ADMIN_IDS = [int(id.strip()) for id in ADMIN_IDS_STR.split(",") if id.strip()]

# Support contacts
SUPPORT_USERNAME = os.getenv("SUPPORT_USERNAME", "@YaUberu_Support")
SUPPORT_PHONE = os.getenv("SUPPORT_PHONE", "+7 (999) 123-45-67")

# Initialize
bot = Bot(token=TOKEN)
dp = Dispatcher()
router = Router()

# ================== API CLIENT ==================
async def fetch(endpoint, params=None):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_BASE}{endpoint}", params=params) as resp:
                if resp.status == 200:
                    return await resp.json()
                logger.error(f"API Error {resp.status} on {endpoint}")
                return None
    except Exception as e:
        logger.error(f"Fetch error: {e}")
        return None

async def post(endpoint, params=None, json_data=None):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{API_BASE}{endpoint}", params=params, json=json_data) as resp:
                return resp.status == 200
    except Exception as e:
        logger.error(f"Post error: {e}")
        return False

# ================== KEYBOARDS ==================
def get_main_keyboard(is_admin: bool = False) -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text="📋 Мои задачи", callback_data="my_tasks")],
        [InlineKeyboardButton(text="📊 Моя статистика", callback_data="my_stats")],
        [
            InlineKeyboardButton(text="❓ FAQ", callback_data="faq"),
            InlineKeyboardButton(text="💬 Поддержка", callback_data="support")
        ],
    ]
    
    if is_admin:
        buttons.append([InlineKeyboardButton(text="👑 Админ-панель", callback_data="admin_panel")])
    
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_back_to_main() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")]
    ])

def get_faq_keyboard() -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text="💰 Как начисляется оплата?", callback_data="faq_payment")],
        [InlineKeyboardButton(text="📦 Что делать если клиента нет?", callback_data="faq_no_client")],
        [InlineKeyboardButton(text="🚫 Могу ли я отменить заказ?", callback_data="faq_cancel")],
        [InlineKeyboardButton(text="⏰ Как работают слоты времени?", callback_data="faq_slots")],
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_admin_keyboard() -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text="📊 Статистика сегодня", callback_data="admin_stats")],
        [InlineKeyboardButton(text="👥 Все курьеры", callback_data="admin_couriers")],
        [InlineKeyboardButton(text="🏢 Все ЖК", callback_data="admin_complexes")],
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_complexes_keyboard(complexes: list) -> InlineKeyboardMarkup:
    buttons = []
    for c in complexes:
        count = c["orders_count"]
        emoji = "🟢" if count > 0 else "⚪️"
        text = f"{emoji} {c['name']}"
        if count > 0:
            text += f" • {count} заказов"
        buttons.append([InlineKeyboardButton(
            text=text,
            callback_data=f"complex_{c['id']}"
        )])
    buttons.append([InlineKeyboardButton(text="🔄 Обновить", callback_data="my_tasks")])
    buttons.append([InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_buildings_keyboard(complex_id: int, buildings: list) -> InlineKeyboardMarkup:
    buttons = []
    for building in buildings:
        buttons.append([InlineKeyboardButton(
            text=f"🏠 Дом {building}",
            callback_data=f"building_{complex_id}_{building}"
        )])
    buttons.append([InlineKeyboardButton(text="⬅️ Назад к ЖК", callback_data="my_tasks")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_order_keyboard(order_id: int) -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text="🚀 Взять заказ", callback_data=f"take_{order_id}")],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="back_orders")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_complete_keyboard(order_id: int) -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text="✅ Выполнено", callback_data=f"complete_{order_id}")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="back_orders")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_bags_keyboard(order_id: int) -> InlineKeyboardMarkup:
    buttons = [
        [
            InlineKeyboardButton(text="1️⃣", callback_data=f"bags_{order_id}_1"),
            InlineKeyboardButton(text="2️⃣", callback_data=f"bags_{order_id}_2"),
            InlineKeyboardButton(text="3️⃣", callback_data=f"bags_{order_id}_3"),
            InlineKeyboardButton(text="4️⃣", callback_data=f"bags_{order_id}_4"),
            InlineKeyboardButton(text="5️⃣", callback_data=f"bags_{order_id}_5"),
        ],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data=f"take_{order_id}")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_undo_keyboard(order_id: int) -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text="↩️ Отменить (ошибся)", callback_data=f"undo_{order_id}")],
        [InlineKeyboardButton(text="📋 К задачам", callback_data="my_tasks")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

# ================== WELCOME MESSAGE ==================
WELCOME_TEXT = """
🍃 **Добро пожаловать в команду «Я УБЕРУ»!**

Вы — курьер нашего сервиса по вывозу мусора. Здесь вы будете получать заказы и управлять своей работой.

━━━━━━━━━━━━━━━━━━━━
**🚀 Как это работает:**

1️⃣ Клиент оформляет заказ
2️⃣ Вам приходит уведомление
3️⃣ Первый курьер берёт заказ
4️⃣ Забираете мусор → нажимаете «Готово»
5️⃣ Получаете оплату в конце дня

━━━━━━━━━━━━━━━━━━━━
**💡 Советы:**

• Проверяйте задачи регулярно
• Не забывайте отмечать выполнение
• При проблемах — пишите в поддержку

━━━━━━━━━━━━━━━━━━━━

Выберите действие ниже 👇
"""

# ================== HANDLERS ==================
@router.message(CommandStart())
async def cmd_start(message: Message):
    telegram_id = message.from_user.id
    is_admin = telegram_id in ADMIN_IDS
    
    # Check if user is a courier
    courier_check = await fetch(f"/courier/check/{telegram_id}")
    
    if not courier_check or not courier_check.get("is_courier"):
        # NOT A COURIER - show access denied
        await message.answer(
            "❌ **Доступ запрещён**\n\n"
            "Этот бот предназначен только для курьеров сервиса «Я УБЕРУ».\n\n"
            "Если вы хотите стать курьером, свяжитесь с администратором:\n"
            f"{SUPPORT_USERNAME}",
            parse_mode="Markdown"
        )
        return
    
    # IS A COURIER - show welcome
    await message.answer(
        WELCOME_TEXT,
        reply_markup=get_main_keyboard(is_admin),
        parse_mode="Markdown"
    )

@router.callback_query(F.data == "main_menu")
async def back_to_main(callback: CallbackQuery):
    is_admin = callback.from_user.id in ADMIN_IDS
    await callback.message.edit_text(
        WELCOME_TEXT,
        reply_markup=get_main_keyboard(is_admin),
        parse_mode="Markdown"
    )

# ================== FAQ ==================
@router.callback_query(F.data == "faq")
async def show_faq(callback: CallbackQuery):
    text = """
❓ **Частые вопросы**

Выберите интересующую тему:
"""
    await callback.message.edit_text(
        text,
        reply_markup=get_faq_keyboard(),
        parse_mode="Markdown"
    )

@router.callback_query(F.data == "faq_payment")
async def faq_payment(callback: CallbackQuery):
    text = """
💰 **Как начисляется оплата?**

• Оплата начисляется за каждый выполненный заказ
• Один заказ = фиксированная ставка
• Выплаты производятся ежедневно вечером
• Бонусы за срочные заказы (x1.5)

Вопросы по оплате → в поддержку
"""
    await callback.message.edit_text(
        text,
        reply_markup=get_back_to_main(),
        parse_mode="Markdown"
    )

@router.callback_query(F.data == "faq_no_client")
async def faq_no_client(callback: CallbackQuery):
    text = """
📦 **Что делать, если клиента нет?**

1. Проверьте, есть ли пакет у двери
2. Если пакета нет — позвоните клиенту
3. Номер клиента указан в комментарии
4. Если не отвечает → подождите 5 минут
5. Нет ответа → напишите в поддержку

⚠️ Не отмечайте заказ выполненным без мусора!
"""
    await callback.message.edit_text(
        text,
        reply_markup=get_back_to_main(),
        parse_mode="Markdown"
    )

@router.callback_query(F.data == "faq_cancel")
async def faq_cancel(callback: CallbackQuery):
    text = """
🚫 **Могу ли я отменить заказ?**

• Если взяли заказ по ошибке — можно отменить
• После выполнения — 5 минут на отмену
• Частые отмены = снижение рейтинга

Лучше не брать заказ, если не уверены!
"""
    await callback.message.edit_text(
        text,
        reply_markup=get_back_to_main(),
        parse_mode="Markdown"
    )

@router.callback_query(F.data == "faq_slots")
async def faq_slots(callback: CallbackQuery):
    text = """
⏰ **Слоты времени**

📍 **08:00 — 10:00** • Утро
📍 **12:00 — 14:00** • День
📍 **16:00 — 18:00** • Вечер
📍 **20:00 — 22:00** • Ночь

Приезжайте в начале слота!
Клиент ожидает вас в это время.
"""
    await callback.message.edit_text(
        text,
        reply_markup=get_back_to_main(),
        parse_mode="Markdown"
    )

# ================== SUPPORT ==================
@router.callback_query(F.data == "support")
async def show_support(callback: CallbackQuery):
    text = f"""
💬 **Поддержка курьеров**

По любым вопросам пишите:

👤 **Менеджер:** {SUPPORT_USERNAME}
📱 **Телефон:** {SUPPORT_PHONE}

⏰ Время ответа: до 30 минут (9:00–21:00)

━━━━━━━━━━━━━━━━━━━━

**Срочные ситуации:**
• Клиент агрессивен
• Не можете найти адрес
• Технические проблемы

Звоните сразу! ☎️
"""
    await callback.message.edit_text(
        text,
        reply_markup=get_back_to_main(),
        parse_mode="Markdown"
    )

# ================== STATS ==================
@router.callback_query(F.data == "my_stats")
async def show_my_stats(callback: CallbackQuery):
    telegram_id = callback.from_user.id
    
    # Fetch real stats from API
    stats = await fetch(f"/courier/stats/{telegram_id}")
    
    if not stats:
        text = "❌ Ошибка загрузки статистики"
    else:
        today = stats.get("today", {})
        week = stats.get("week", {})
        month = stats.get("month", {})
        rating = stats.get("rating", 5.0)
        
        text = f"""
📊 **Ваша статистика**

━━━ Сегодня ━━━
✅ Выполнено: **{today.get('orders', 0)}** заказов
📦 Пакетов: **{today.get('bags', 0)}** шт

━━━ За неделю ━━━
✅ Выполнено: **{week.get('orders', 0)}** заказов
💰 Заработано: **{week.get('earned', 0)} ₽**

━━━ За месяц ━━━
✅ Выполнено: **{month.get('orders', 0)}** заказов
💰 Заработано: **{month.get('earned', 0)} ₽**
⭐️ Рейтинг: **{rating}**

_Обновлено: {datetime.now().strftime('%H:%M')}_
"""
    
    await callback.message.edit_text(
        text,
        reply_markup=get_back_to_main(),
        parse_mode="Markdown"
    )

# ================== ADMIN ==================
@router.callback_query(F.data == "admin_panel")
async def show_admin_panel(callback: CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("❌ Нет доступа", show_alert=True)
        return
    
    text = """
👑 **Админ-панель**

Управление сервисом «Я УБЕРУ»

Выберите раздел:
"""
    await callback.message.edit_text(
        text,
        reply_markup=get_admin_keyboard(),
        parse_mode="Markdown"
    )

@router.callback_query(F.data == "admin_stats")
async def admin_stats(callback: CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("❌ Нет доступа", show_alert=True)
        return
    
    stats = await fetch("/admin/stats")
    if not stats:
        await callback.answer("Ошибка загрузки статистики", show_alert=True)
        return
    
    text = f"""
📊 **Статистика на сегодня**

📦 Заказов сегодня: **{stats.get('total_orders_today', 0)}**
✅ Выполнено: **{stats.get('completed_today', 0)}**
👥 Активных подписок: **{stats.get('active_subscriptions', 0)}**
💰 Выручка за месяц: **{stats.get('total_revenue_month', 0)} ₽**

_Обновлено: {datetime.now().strftime('%H:%M')}_
"""
    await callback.message.edit_text(
        text,
        reply_markup=get_admin_keyboard(),
        parse_mode="Markdown"
    )

@router.callback_query(F.data == "admin_couriers")
async def admin_couriers(callback: CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("❌ Нет доступа", show_alert=True)
        return
    
    couriers = await fetch("/admin/couriers")
    if not couriers:
        text = "👥 **Курьеры**\n\nСписок пуст"
    else:
        text = "👥 **Курьеры**\n\n"
        for c in couriers:
            status = "🟢" if c.get("is_active") else "🔴"
            text += f"{status} {c['name']} (ID: {c['telegram_id']})\n"
    
    await callback.message.edit_text(
        text,
        reply_markup=get_admin_keyboard(),
        parse_mode="Markdown"
    )

@router.callback_query(F.data == "admin_complexes")
async def admin_complexes(callback: CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("❌ Нет доступа", show_alert=True)
        return
    
    complexes = await fetch("/admin/complexes")
    if not complexes:
        text = "🏢 **Жилые комплексы**\n\nСписок пуст"
    else:
        text = "🏢 **Жилые комплексы**\n\n"
        for c in complexes:
            status = "🟢" if c.get("is_active") else "🔴"
            text += f"{status} {c['name']}\n"
    
    await callback.message.edit_text(
        text,
        reply_markup=get_admin_keyboard(),
        parse_mode="Markdown"
    )

# ================== TASKS ==================
@router.callback_query(F.data == "my_tasks")
async def show_tasks(callback: CallbackQuery):
    complexes = await fetch("/courier/complexes")
    if complexes is None:
        await callback.answer("Ошибка связи с сервером", show_alert=True)
        return

    total_orders = sum(c["orders_count"] for c in complexes)
    
    if total_orders == 0:
        text = """
📋 **Задачи на сегодня**

✨ Свободно! Нет активных заказов.

_Новые заказы появятся здесь автоматически.
Также вы получите уведомление._
"""
    else:
        text = f"""
📋 **Задачи на сегодня**

📦 Доступно заказов: **{total_orders}**

Выберите локацию:
"""
    
    await callback.message.edit_text(
        text,
        reply_markup=get_complexes_keyboard(complexes),
        parse_mode="Markdown"
    )

@router.callback_query(F.data.startswith("complex_"))
async def show_buildings(callback: CallbackQuery, state: FSMContext):
    complex_id = int(callback.data.split("_")[1])
    
    buildings = await fetch(f"/courier/buildings?complex_id={complex_id}")
    if buildings is None:
        await callback.answer("Ошибка загрузки", show_alert=True)
        return

    await state.update_data(complex_id=complex_id)
    
    if not buildings:
        await callback.answer("В этом ЖК нет активных заказов", show_alert=True)
        return
    
    text = "🏢 **Выберите дом:**"
    await callback.message.edit_text(
        text,
        reply_markup=get_buildings_keyboard(complex_id, buildings),
        parse_mode="Markdown"
    )

@router.callback_query(F.data.startswith("building_"))
async def show_orders_in_building(callback: CallbackQuery, state: FSMContext):
    parts = callback.data.split("_")
    complex_id = int(parts[1])
    building = parts[2]
    
    await state.update_data(building=building)
    
    orders = await fetch(f"/courier/orders?complex_id={complex_id}&building={building}")
    
    if not orders:
        await callback.message.edit_text(
            f"🏠 **Дом {building}**\n\n✅ Все заказы выполнены!",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="⬅️ Назад", callback_data=f"complex_{complex_id}")]
            ]),
            parse_mode="Markdown"
        )
        return
    
    text = f"🏠 **Дом {building}**\n\n"
    for order in orders:
        status_emoji = "🟡" if order['status'] == 'scheduled' else "🔵"
        text += (
            f"{status_emoji} **Заказ #{order['id']}**\n"
            f"┌ 📍 {order.get('full_address', f'д. {building}')}\n"
            f"├ 🕐 {order['time_slot']}\n"
            f"├ 🚪 Подъезд {order['entrance']}, этаж {order['floor']}\n"
            f"├ 🏠 Квартира {order['apartment']}\n"
            f"├ 🔑 Домофон: `{order['intercom']}`\n"
        )
        if order.get('comment'):
            text += f"└ 💬 _{order['comment']}_\n"
        text += "\n"
    
    first_order = orders[0]
    await callback.message.edit_text(
        text,
        reply_markup=get_order_keyboard(first_order["id"]),
        parse_mode="Markdown"
    )

@router.callback_query(F.data.startswith("take_"))
async def take_order_handler(callback: CallbackQuery, state: FSMContext):
    order_id = int(callback.data.split("_")[1])
    courier_tg_id = callback.from_user.id
    
    success = await post(
        f"/courier/orders/{order_id}/take",
        json_data={"courier_telegram_id": courier_tg_id}
    )
    if not success:
        await callback.answer("❌ Заказ уже взят другим курьером!", show_alert=True)
        return
    
    # Get order details from state to show full info
    data = await state.get_data()
    complex_id = data.get("complex_id")
    building = data.get("building")
    
    # Fetch fresh order details
    orders = await fetch(f"/courier/orders?complex_id={complex_id}&building={building}")
    order_info = next((o for o in orders if o['id'] == order_id), None) if orders else None
    
    text = f"📦 **Заказ #{order_id} — ваш!**\n\n"
    
    if order_info:
        text += f"📍 **{order_info.get('full_address', 'Адрес')}**\n"
        text += f"🚪 Подъезд {order_info['entrance']}, этаж {order_info['floor']}\n"
        text += f"🏠 Квартира {order_info['apartment']}\n"
        text += f"🔑 Домофон: `{order_info['intercom']}`\n"
        if order_info.get('comment'):
            text += f"💬 _{order_info['comment']}_\n"
        text += "\n"
    
    text += """✅ **Клиент уведомлен, что вы едете!**

━━━━━━━━━━━━━━━━━━━━

**Что делать:**
1. Приехать по адресу
2. Забрать пакет(ы) у двери
3. Нажать «Выполнено»

⚠️ Если пакета нет — позвоните клиенту!
"""
    
    await callback.message.edit_text(
        text,
        reply_markup=get_complete_keyboard(order_id),
        parse_mode="Markdown"
    )

@router.callback_query(F.data.startswith("complete_"))
async def complete_order_handler(callback: CallbackQuery):
    order_id = int(callback.data.split("_")[1])
    
    await callback.message.edit_text(
        f"📦 **Заказ #{order_id}**\n\n"
        "Сколько пакетов забрали?",
        reply_markup=get_bags_keyboard(order_id),
        parse_mode="Markdown"
    )

@router.callback_query(F.data.startswith("bags_"))
async def set_bags_and_complete(callback: CallbackQuery):
    parts = callback.data.split("_")
    order_id = int(parts[1])
    bags_count = int(parts[2])
    
    success = await post(f"/courier/orders/{order_id}/complete?bags_count={bags_count}")
    if not success:
        await callback.answer("Ошибка завершения", show_alert=True)
        return
    
    if bags_count == 1:
        bags_text = "1 пакет"
    elif bags_count < 5:
        bags_text = f"{bags_count} пакета"
    else:
        bags_text = f"{bags_count} пакетов"
    
    await callback.message.edit_text(
        f"""
✅ **Заказ #{order_id} выполнен!**

📦 Забрали: **{bags_text}**
💰 Начислено: +1 заказ (100 ₽)

━━━━━━━━━━━━━━━━━━━━

✅ **Клиент получил уведомление о завершении!**

_Если ошиблись — можете отменить (5 мин)_
""",
        reply_markup=get_undo_keyboard(order_id),
        parse_mode="Markdown"
    )

@router.callback_query(F.data.startswith("undo_"))
async def undo_completion(callback: CallbackQuery):
    order_id = int(callback.data.split("_")[1])
    
    success = await post(f"/courier/orders/{order_id}/undo")
    if not success:
        await callback.answer("❌ Время вышло или ошибка", show_alert=True)
        return
    
    await callback.message.edit_text(
        f"↩️ **Заказ #{order_id} возвращён**\n\n"
        "Заказ снова доступен для взятия.",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📋 К задачам", callback_data="my_tasks")]
        ]),
        parse_mode="Markdown"
    )

@router.callback_query(F.data == "back_orders")
async def back_to_orders(callback: CallbackQuery, state: FSMContext):
    await show_tasks(callback)

# ================== MAIN ==================
async def main():
    dp.include_router(router)
    logger.info("🚀 Courier bot starting...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
