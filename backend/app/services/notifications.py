"""
Telegram notifications service
"""
import httpx
from app.config import settings


async def send_telegram_notification(chat_id: int, text: str):
    """Send a notification message to a Telegram user"""
    if not settings.TELEGRAM_BOT_TOKEN or not chat_id:
        print(f"[NOTIFY] Skipping notification: token={bool(settings.TELEGRAM_BOT_TOKEN)}, chat_id={chat_id}")
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "Markdown",
            }
            response = await client.post(url, json=payload)
            print(f"[NOTIFY] Sent to {chat_id}: {response.status_code}")
            return response.status_code == 200
    except Exception as e:
        print(f"[NOTIFY ERROR] {e}")
        return False


# ============ NOTIFICATIONS FOR COURIERS ============

async def notify_all_couriers_new_order(courier_telegram_ids: list, address: str, time_slot: str, comment: str = None):
    """Notify ALL couriers about a new order available for pickup"""
    text = (
        f"🆕 **Новый заказ!**\n\n"
        f"📍 {address}\n"
        f"🕐 {time_slot}\n"
    )
    if comment:
        text += f"💬 {comment}\n"
    
    text += "\n⚡️ Кто первый возьмет — того и заказ!"
    
    for tg_id in courier_telegram_ids:
        await send_telegram_notification(tg_id, text)


# ============ NOTIFICATIONS FOR CLIENTS ============

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
    """Notify all admins about a new order"""
    text = (
        f"📋 **Новый заказ #{order_id}**\n\n"
        f"👤 Клиент: {client_name}\n"
        f"📍 Адрес: {address}\n"
        f"🕐 Время: {time_slot}\n\n"
        f"_Курьеры получили уведомление_"
    )
    
    for tg_id in admin_telegram_ids:
        await send_telegram_notification(tg_id, text)

