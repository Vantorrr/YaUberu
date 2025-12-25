"""
Telegram notifications service
"""
import httpx
from app.config import settings


async def send_telegram_notification(chat_id: int, text: str, reply_markup: dict = None, use_courier_bot: bool = False):
    """Send a notification message to a Telegram user with optional inline keyboard"""
    # Choose bot token based on recipient type
    bot_token = settings.TELEGRAM_COURIER_BOT_TOKEN if use_courier_bot else settings.TELEGRAM_BOT_TOKEN
    
    if not bot_token or not chat_id:
        print(f"[NOTIFY] Skipping notification: token={bool(bot_token)}, chat_id={chat_id}, courier_bot={use_courier_bot}")
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "Markdown",
            }
            if reply_markup:
                payload["reply_markup"] = reply_markup
            
            response = await client.post(url, json=payload)
            print(f"[NOTIFY] Sent to {chat_id} (courier_bot={use_courier_bot}): {response.status_code}")
            if response.status_code != 200:
                print(f"[NOTIFY ERROR] Response: {await response.text()}")
            return response.status_code == 200
    except Exception as e:
        print(f"[NOTIFY ERROR] {e}")
        return False


# ============ NOTIFICATIONS FOR COURIERS ============

async def notify_all_couriers_new_order(courier_telegram_ids: list, order_id: int, address: str, time_slot: str, comment: str = None):
    """Notify ALL couriers about a new order available for pickup - sent via COURIER BOT"""
    text = (
        f"🆕 **Новый заказ #{order_id}!**\n\n"
        f"📍 {address}\n"
        f"🕐 {time_slot}\n"
    )
    if comment:
        text += f"💬 {comment}\n"
    
    text += "\n⚡️ Кто первый возьмет — того и заказ!\n\n"
    text += "👉 Откройте бот курьеров → Мои задачи"
    
    print(f"[NOTIFY] Sending order #{order_id} to {len(courier_telegram_ids)} couriers via COURIER BOT")
    
    for tg_id in courier_telegram_ids:
        result = await send_telegram_notification(tg_id, text, use_courier_bot=True)
        if result:
            print(f"[NOTIFY] ✅ Courier {tg_id} notified")
        else:
            print(f"[NOTIFY] ❌ Failed to notify courier {tg_id}")


# ============ NOTIFICATIONS FOR CLIENTS ============

async def notify_client_order_created(client_telegram_id: int, order_id: int, address: str, time_slot: str):
    """Notify client that their order was created successfully"""
    text = (
        f"✅ **Заказ #{order_id} создан!**\n\n"
        f"📍 Адрес: {address}\n"
        f"🕐 Время: {time_slot}\n\n"
        f"⏳ Ожидаем курьера...\n"
        f"_Мы сообщим, когда курьер возьмет заказ_"
    )
    await send_telegram_notification(client_telegram_id, text)


async def notify_client_courier_took_order(client_telegram_id: int, courier_name: str, time_slot: str):
    """Notify client that a courier took their order"""
    print(f"[NOTIFY] Sending 'courier took order' to client {client_telegram_id}")
    text = (
        f"🚀 **Курьер выехал!**\n\n"
        f"👤 Ваш курьер: **{courier_name}**\n"
        f"🕐 Время прибытия: {time_slot}\n\n"
        f"📦 Не забудьте выставить пакет у двери!\n"
        f"_(Если выбрали \"В руки\" — ожидайте звонка)_"
    )
    result = await send_telegram_notification(client_telegram_id, text)
    print(f"[NOTIFY] Result: {result}")
    return result


async def notify_client_order_completed(client_telegram_id: int, bags_count: int = 1):
    """Notify client that order is completed"""
    print(f"[NOTIFY] Sending 'order completed' to client {client_telegram_id}, bags={bags_count}")
    
    if bags_count == 1:
        bags_text = "1 пакет"
    elif bags_count < 5:
        bags_text = f"{bags_count} пакета"
    else:
        bags_text = f"{bags_count} пакетов"
    
    text = (
        f"✅ **Готово!**\n\n"
        f"📦 Мы забрали {bags_text}\n"
        f"💚 Спасибо, что пользуетесь сервисом **«Я УБЕРУ»**\n\n"
        f"_С баланса списан 1 кредит_"
    )
    result = await send_telegram_notification(client_telegram_id, text)
    print(f"[NOTIFY] Result: {result}")
    return result


# ============ NOTIFICATIONS FOR ADMINS ============

async def notify_admins_new_order(admin_telegram_ids: list, order_id: int, address: str, time_slot: str, client_name: str = "Клиент"):
    """Notify all admins about a new order - sent via COURIER BOT"""
    text = (
        f"📋 **Новый заказ #{order_id}**\n\n"
        f"👤 Клиент: {client_name}\n"
        f"📍 Адрес: {address}\n"
        f"🕐 Время: {time_slot}\n\n"
        f"_Курьеры получили уведомление_"
    )
    
    print(f"[NOTIFY] Sending order #{order_id} to {len(admin_telegram_ids)} admins via COURIER BOT")
    
    for tg_id in admin_telegram_ids:
        result = await send_telegram_notification(tg_id, text, use_courier_bot=True)
        if result:
            print(f"[NOTIFY] ✅ Admin {tg_id} notified")
        else:
            print(f"[NOTIFY] ❌ Failed to notify admin {tg_id}")


async def notify_admins_courier_took_order(admin_telegram_ids: list, order_id: int, courier_name: str, address: str):
    """Notify all admins that a courier took an order - sent via COURIER BOT"""
    text = (
        f"🚀 **Заказ #{order_id} взят!**\n\n"
        f"👤 Курьер: **{courier_name}**\n"
        f"📍 Адрес: {address}\n\n"
        f"_Клиент получил уведомление_"
    )
    
    print(f"[NOTIFY] Order #{order_id} taken by {courier_name}, notifying {len(admin_telegram_ids)} admins")
    
    for tg_id in admin_telegram_ids:
        await send_telegram_notification(tg_id, text, use_courier_bot=True)


async def notify_admins_order_completed(admin_telegram_ids: list, order_id: int, courier_name: str, bags_count: int):
    """Notify all admins that an order was completed - sent via COURIER BOT"""
    if bags_count == 1:
        bags_text = "1 пакет"
    elif bags_count < 5:
        bags_text = f"{bags_count} пакета"
    else:
        bags_text = f"{bags_count} пакетов"
    
    text = (
        f"✅ **Заказ #{order_id} выполнен!**\n\n"
        f"👤 Курьер: **{courier_name}**\n"
        f"📦 Забрали: {bags_text}\n\n"
        f"_Клиент получил уведомление_"
    )
    
    print(f"[NOTIFY] Order #{order_id} completed by {courier_name}, notifying {len(admin_telegram_ids)} admins")
    
    for tg_id in admin_telegram_ids:
        await send_telegram_notification(tg_id, text, use_courier_bot=True)

