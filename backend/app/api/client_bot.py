from fastapi import APIRouter, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models import get_db, User, Balance
import httpx
import os

router = APIRouter()

async def send_telegram_message(chat_id: int, text: str, keyboard: dict = None):
    async with httpx.AsyncClient() as client:
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown",
        }
        if keyboard:
            payload["reply_markup"] = keyboard
        
        await client.post(url, json=payload)

@router.post("/webhook")
async def telegram_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    data = await request.json()
    
    if "message" in data:
        message = data["message"]
        chat_id = message["chat"]["id"]
        text = message.get("text", "")
        telegram_user_id = message.get("from", {}).get("id")
        
        # Логика 1: Пользователь нажал /start
        if text == "/start":
            # Проверяем, есть ли у пользователя телефон в БД
            result = await db.execute(select(User).where(User.telegram_id == telegram_user_id))
            user = result.scalar_one_or_none()
            
            if user and user.phone:
                # Уже зарегистрирован, даем кнопку входа
                frontend_url = os.getenv("FRONTEND_URL", "https://awake-imagination-production.up.railway.app")
                keyboard = {
                    "inline_keyboard": [[
                        {
                            "text": "🚀 Открыть приложение",
                            "web_app": {"url": frontend_url}
                        }
                    ]]
                }
                await send_telegram_message(
                    chat_id, 
                    f"👋 **С возвращением, {user.name}!**\n\nОткройте приложение, чтобы оформить вывоз мусора.",
                    keyboard
                )
            else:
                # Новый пользователь, просим контакт
                keyboard = {
                    "keyboard": [[
                        {
                            "text": "📱 Поделиться телефоном",
                            "request_contact": True
                        }
                    ]],
                    "resize_keyboard": True,
                    "one_time_keyboard": True
                }
                
                await send_telegram_message(
                    chat_id, 
                    "👋 **Привет! Это «Я УБЕРУ»** 🍃\n\nЧтобы мы могли связываться с вами и уведомлять о статусе заказов, пожалуйста, поделитесь номером телефона 👇",
                    keyboard
                )
            
        # Логика 2: Пользователь отправил контакт
        elif "contact" in message:
            contact = message["contact"]
            phone = contact.get("phone_number")
            user_id = contact.get("user_id")
            first_name = contact.get("first_name", "User")
            last_name = contact.get("last_name", "")
            
            # Если телефон без плюса, добавим
            if phone and not phone.startswith("+"):
                phone = f"+{phone}"

            # Ищем пользователя или создаем
            result = await db.execute(select(User).where(User.telegram_id == user_id))
            user = result.scalar_one_or_none()
            
            full_name = first_name + (f" {last_name}" if last_name else "")
            
            if user:
                # Обновляем телефон
                user.phone = phone
                user.name = full_name
            else:
                # Создаем нового
                user = User(
                    telegram_id=user_id,
                    name=full_name,
                    phone=phone
                )
                db.add(user)
                await db.flush()
                
                # Даем приветственные бонусы
                balance = Balance(user_id=user.id, credits=5)
                db.add(balance)
            
            await db.commit()
            
            # Отправляем ссылку на Web App
            frontend_url = os.getenv("FRONTEND_URL", "https://awake-imagination-production.up.railway.app")
            
            # Убираем клавиатуру и даем кнопку входа
            remove_kb = {"remove_keyboard": True}
            await send_telegram_message(chat_id, "✅ **Спасибо! Ваш номер сохранен.**", remove_kb)
            
            inline_keyboard = {
                "inline_keyboard": [[
                    {
                        "text": "🚀 Открыть приложение",
                        "web_app": {"url": frontend_url}
                    }
                ]]
            }
            
            await send_telegram_message(
                chat_id, 
                "Теперь вы можете войти в приложение и оформить вывоз мусора 🗑️✨",
                inline_keyboard
            )
            
    return {"status": "ok"}
