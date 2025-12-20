import asyncio
import logging
import os
import aiohttp
from datetime import datetime, timedelta
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_BASE = os.getenv("API_BASE_URL", "http://localhost:8080/api")

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

async def post(endpoint, params=None):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{API_BASE}{endpoint}", params=params) as resp:
                return resp.status == 200
    except Exception as e:
        logger.error(f"Post error: {e}")
        return False

# ================== STATES ==================
class CourierStates(StatesGroup):
    pass 

# ================== KEYBOARDS ==================
def get_main_keyboard() -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text="📋 Мои задачи", callback_data="my_tasks")],
        [InlineKeyboardButton(text="📊 Статистика", callback_data="stats")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_complexes_keyboard(complexes: list) -> InlineKeyboardMarkup:
    buttons = []
    for complex in complexes:
        count = complex["orders_count"]
        text = f"🏢 {complex['name']}"
        if count > 0:
            text += f" [{count}]"
        buttons.append([InlineKeyboardButton(
            text=text,
            callback_data=f"complex_{complex['id']}"
        )])
    buttons.append([InlineKeyboardButton(text="🔄 Обновить", callback_data="my_tasks")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_buildings_keyboard(complex_id: int, buildings: list) -> InlineKeyboardMarkup:
    buttons = []
    for building in buildings:
        buttons.append([InlineKeyboardButton(
            text=f"🏠 Дом {building}",
            callback_data=f"building_{complex_id}_{building}"
        )])
    buttons.append([InlineKeyboardButton(text="⬅️ Назад", callback_data="my_tasks")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_order_keyboard(order_id: int) -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text="🚀 Взял в работу", callback_data=f"take_{order_id}")],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="back_orders")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_complete_keyboard(order_id: int) -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text="✅ Готово", callback_data=f"complete_{order_id}")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="back_orders")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_bags_keyboard(order_id: int) -> InlineKeyboardMarkup:
    buttons = [
        [
            InlineKeyboardButton(text="1️⃣", callback_data=f"bags_{order_id}_1"),
            InlineKeyboardButton(text="2️⃣", callback_data=f"bags_{order_id}_2"),
            InlineKeyboardButton(text="3️⃣", callback_data=f"bags_{order_id}_3"),
        ],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data=f"take_{order_id}")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_undo_keyboard(order_id: int) -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text="↩️ Отменить выполнение", callback_data=f"undo_{order_id}")],
        [InlineKeyboardButton(text="⬅️ К списку задач", callback_data="my_tasks")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

# ================== HANDLERS ==================
@router.message(CommandStart())
async def cmd_start(message: Message):
    await message.answer(
        "👋 Добро пожаловать в бот курьера **Я УБЕРУ**!\n\n"
        "Здесь вы будете получать задачи на вынос мусора.",
        reply_markup=get_main_keyboard(),
        parse_mode="Markdown"
    )

@router.callback_query(F.data == "back_main")
async def back_to_main(callback: CallbackQuery):
    await callback.message.edit_text(
        "👋 Главное меню\n\nВыберите действие:",
        reply_markup=get_main_keyboard()
    )

@router.callback_query(F.data == "my_tasks")
async def show_tasks(callback: CallbackQuery):
    complexes = await fetch("/courier/complexes")
    if complexes is None:
        await callback.answer("Ошибка связи с сервером", show_alert=True)
        return

    total_orders = sum(c["orders_count"] for c in complexes)
    
    text = (
        f"📋 **Задачи на сегодня**\n\n"
        f"Всего заказов: {total_orders}\n\n"
        "Выберите локацию:"
    )
    
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
        await callback.answer("Ошибка загрузки домов", show_alert=True)
        return

    await state.update_data(complex_id=complex_id)
    
    if not buildings:
        await callback.answer("В этом ЖК нет активных заказов", show_alert=True)
        return
    
    text = f"🏢 Выберите дом:"
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
            f"🏠 Дом {building}\n\n✅ Все заказы выполнены!",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="⬅️ Назад", callback_data=f"complex_{complex_id}")]
            ])
        )
        return
    
    text = f"🏠 **Дом {building}**\n\n"
    for order in orders:
        text += (
            f"🕐 **{order['time_slot']}**\n"
            f"├ Подъезд: {order['entrance']}\n"
            f"├ Этаж: {order['floor']}\n"
            f"├ Кв: {order['apartment']}\n"
            f"└ Домофон: `{order['intercom']}`\n"
            f"ℹ️ {order['comment'] or 'Без комментария'}\n\n"
        )
    
    first_order = orders[0]
    await callback.message.edit_text(
        text,
        reply_markup=get_order_keyboard(first_order["id"]),
        parse_mode="Markdown"
    )

@router.callback_query(F.data.startswith("take_"))
async def take_order_handler(callback: CallbackQuery):
    order_id = int(callback.data.split("_")[1])
    
    success = await post(f"/courier/orders/{order_id}/take")
    if not success:
        await callback.answer("Ошибка взятия заказа", show_alert=True)
        return
    
    # We need detailed order info here, but for now just show confirmation
    # Simplification: Assume user remembers details from previous screen
    text = (
        f"📦 **Заказ #{order_id} в работе**\n\n"
        "Когда заберете мусор, нажмите **Готово**"
    )
    
    await callback.message.edit_text(
        text,
        reply_markup=get_complete_keyboard(order_id),
        parse_mode="Markdown"
    )

@router.callback_query(F.data.startswith("complete_"))
async def complete_order_handler(callback: CallbackQuery):
    order_id = int(callback.data.split("_")[1])
    
    await callback.message.edit_text(
        "📦 **Сколько пакетов забрали?**\n\n"
        "Выберите количество:",
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
    
    await callback.message.edit_text(
        f"✅ **Заказ #{order_id} выполнен!**\n\n"
        f"Пакетов: {bags_count}\n\n"
        "⚠️ Вы можете отменить в течение 5 минут, если ошиблись.",
        reply_markup=get_undo_keyboard(order_id),
        parse_mode="Markdown"
    )

@router.callback_query(F.data.startswith("undo_"))
async def undo_completion(callback: CallbackQuery):
    order_id = int(callback.data.split("_")[1])
    
    success = await post(f"/courier/orders/{order_id}/undo")
    if not success:
        await callback.answer("Ошибка отмены", show_alert=True)
        return
    
    await callback.message.edit_text(
        f"↩️ **Заказ #{order_id} возвращен в работу**",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📋 К задачам", callback_data="my_tasks")]
        ]),
        parse_mode="Markdown"
    )

@router.callback_query(F.data == "back_orders")
async def back_to_orders(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    building = data.get("building")
    complex_id = data.get("complex_id")
    
    if building and complex_id:
        # Re-trigger showing orders
        await show_orders_in_building(callback, state)
    else:
        await show_tasks(callback)

# ================== MAIN ==================
async def main():
    dp.include_router(router)
    logger.info("Starting courier bot...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
