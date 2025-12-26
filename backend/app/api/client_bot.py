from fastapi import APIRouter, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models import get_db, User, Balance
import httpx
import asyncio

router = APIRouter()

async def send_telegram_message(chat_id: int, text: str, keyboard: dict = None):
    token = settings.TELEGRAM_BOT_TOKEN
    print(f"[BOT] Sending message to {chat_id}, token exists: {bool(token)}")
    
    if not token:
        print("[BOT ERROR] TELEGRAM_BOT_TOKEN is not set!")
        return
    
    async with httpx.AsyncClient() as client:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown",
        }
        if keyboard:
            payload["reply_markup"] = keyboard
        
        try:
            response = await client.post(url, json=payload)
            print(f"[BOT] Telegram API response: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"[BOT ERROR] Failed to send message: {e}")


async def send_telegram_photo(chat_id: int, photo_url: str, caption: str = None, keyboard: dict = None):
    """Send a photo with optional caption and keyboard"""
    token = settings.TELEGRAM_BOT_TOKEN
    print(f"[BOT] Sending photo to {chat_id}")
    
    if not token:
        print("[BOT ERROR] TELEGRAM_BOT_TOKEN is not set!")
        return
    
    async with httpx.AsyncClient() as client:
        url = f"https://api.telegram.org/bot{token}/sendPhoto"
        payload = {
            "chat_id": chat_id,
            "photo": photo_url,
        }
        if caption:
            payload["caption"] = caption
            payload["parse_mode"] = "Markdown"
        if keyboard:
            payload["reply_markup"] = keyboard
        
        try:
            response = await client.post(url, json=payload)
            print(f"[BOT] Photo sent: {response.status_code}")
        except Exception as e:
            print(f"[BOT ERROR] Failed to send photo: {e}")


async def send_welcome_slides(chat_id: int):
    """Send 3 onboarding slides for new users"""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        print("[BOT ERROR] TELEGRAM_BOT_TOKEN is not set!")
        return
    
    # 3 onboarding photos with captions
    slides = [
        {
            "url": "https://i.ibb.co/Dz8JQdc/11111111.jpg",
            "caption": "**1️⃣ Оставьте у двери**\n\nПросто выставьте пакет за дверь. Никаких лишних действий."
        },
        {
            "url": "https://i.ibb.co/5vRX8Sq/22222222.jpg",
            "caption": "**2️⃣ Курьер заберет**\n\nКурьер придёт в выбранное время и заберёт мусор."
        },
        {
            "url": "https://i.ibb.co/SXgzwmn/333333333.jpg",
            "caption": "**3️⃣ Забудьте о мусоре**\n\nПодписка работает автоматически. Вы просто живете."
        }
    ]
    
    async with httpx.AsyncClient() as client:
        for slide in slides:
            url = f"https://api.telegram.org/bot{token}/sendPhoto"
            payload = {
                "chat_id": chat_id,
                "photo": slide["url"],
                "caption": slide["caption"],
                "parse_mode": "Markdown"
            }
            
            try:
                response = await client.post(url, json=payload)
                print(f"[BOT] Slide sent: {response.status_code}")
                # Small delay between slides
                await asyncio.sleep(0.5)
            except Exception as e:
                print(f"[BOT ERROR] Failed to send slide: {e}")

@router.post("/webhook")
async def telegram_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    data = await request.json()
    print(f"[WEBHOOK] Received: {data}")
    
    # Handle callback queries (button clicks)
    if "callback_query" in data:
        callback = data["callback_query"]
        chat_id = callback["message"]["chat"]["id"]
        callback_data = callback.get("data", "")
        
        if callback_data == "help":
            help_text = """❓ **Помощь**

**Как это работает:**
1️⃣ Купите пакет выносов
2️⃣ Оформите заказ на удобное время
3️⃣ Выставьте мешок у двери
4️⃣ Курьер заберёт в нужный слот

**Слоты времени:**
🌅 08:00 — 10:00 (Утро)
☀️ 12:00 — 14:00 (День)
🌆 16:00 — 18:00 (Вечер)
🌙 20:00 — 22:00 (Ночь)

**Тарифы:**
• Разовый: 300 ₽
• Пробный (3 шт): 500 ₽
• Стандарт (15 шт): 3000 ₽
• Премиум (30 шт): 5000 ₽
• Срочный (час): 450 ₽"""
            
            keyboard = {
                "inline_keyboard": [[
                    {"text": "🏠 Главное меню", "callback_data": "menu"}
                ]]
            }
            await send_telegram_message(chat_id, help_text, keyboard)
            
        elif callback_data == "support":
            support_text = f"""💬 **Поддержка**

👤 Менеджер: {settings.SUPPORT_USERNAME}
📱 Телефон: {settings.SUPPORT_PHONE}
⏰ Работаем: 9:00 — 21:00

**Срочные вопросы:**
• Курьер не приехал
• Проблема с оплатой
• Неправильный адрес
• Жалоба на сервис

Ответим за 15 минут!"""
            
            keyboard = {
                "inline_keyboard": [[
                    {"text": "🏠 Главное меню", "callback_data": "menu"}
                ]]
            }
            await send_telegram_message(chat_id, support_text, keyboard)
            
        elif callback_data == "menu":
            # Показываем главное меню снова с фото
            telegram_user_id = callback["from"]["id"]
            result = await db.execute(
                select(User).where(User.telegram_id == telegram_user_id)
            )
            user = result.scalar_one_or_none()
            
            if user:
                frontend_url = settings.FRONTEND_URL
                balance_result = await db.execute(select(Balance).where(Balance.user_id == user.id))
                balance = balance_result.scalar_one_or_none()
                credits = balance.credits if balance else 0
                
                # Проверяем, админ ли пользователь
                is_admin = telegram_user_id in settings.admin_ids
                
                keyboard = {
                    "inline_keyboard": [
                        [
                            {
                                "text": "🚀 Заказать вынос",
                                "web_app": {"url": f"{frontend_url}/app"}
                            }
                        ],
                        [
                            {
                                "text": "📦 Мои заказы",
                                "web_app": {"url": f"{frontend_url}/app/orders"}
                            }
                        ],
                        [
                            {"text": "💬 Поддержка", "callback_data": "support"}
                        ]
                    ]
                }
                
                # Добавляем кнопку админ-панели для админов
                if is_admin:
                    keyboard["inline_keyboard"].append([
                        {
                            "text": "👑 Админ-панель",
                            "web_app": {"url": f"{frontend_url}/admin"}
                        }
                    ])
                
                caption = f"""👤 **{user.name}**
💼 Баланс: **{credits} выносов**

Выберите действие 👇"""
                
                # Отправляем фото с меню
                await send_telegram_photo(
                    chat_id,
                    photo_url="https://i.ibb.co/pvLXGwbY/1766674254694d4f4e669eb.jpg",
                    caption=caption,
                    keyboard=keyboard
                )
        
        return {"status": "ok"}
    
    if "message" in data:
        message = data["message"]
        chat_id = message["chat"]["id"]
        text = message.get("text", "")
        telegram_user_id = message.get("from", {}).get("id")
        print(f"[WEBHOOK] Processing message from {telegram_user_id}, text: {text}")
        
        # Команды
        if text == "/help":
            help_text = """❓ **Помощь**

**Как это работает:**
1️⃣ Купите пакет выносов
2️⃣ Оформите заказ на удобное время
3️⃣ Выставьте мешок у двери
4️⃣ Курьер заберёт в нужный слот

**Слоты времени:**
🌅 08:00 — 10:00 (Утро)
☀️ 12:00 — 14:00 (День)
🌆 16:00 — 18:00 (Вечер)
🌙 20:00 — 22:00 (Ночь)

**Тарифы:**
• Разовый: 300 ₽
• Пробный (3 шт): 500 ₽
• Стандарт (15 шт): 3000 ₽
• Премиум (30 шт): 5000 ₽
• Срочный (час): 450 ₽"""
            
            keyboard = {
                "inline_keyboard": [[
                    {"text": "🏠 Главное меню", "callback_data": "menu"}
                ]]
            }
            await send_telegram_message(chat_id, help_text, keyboard)
            return {"status": "ok"}
        
        elif text == "/support":
            support_text = f"""💬 **Поддержка**

👤 Менеджер: {settings.SUPPORT_USERNAME}
📱 Телефон: {settings.SUPPORT_PHONE}
⏰ Работаем: 9:00 — 21:00

**Срочные вопросы:**
• Курьер не приехал
• Проблема с оплатой
• Неправильный адрес
• Жалоба на сервис

Ответим за 15 минут!"""
            
            keyboard = {
                "inline_keyboard": [[
                    {"text": "🏠 Главное меню", "callback_data": "menu"}
                ]]
            }
            await send_telegram_message(chat_id, support_text, keyboard)
            return {"status": "ok"}
        
        elif text == "/menu":
            result = await db.execute(select(User).where(User.telegram_id == telegram_user_id))
            user = result.scalar_one_or_none()
            
            if user:
                frontend_url = settings.FRONTEND_URL
                balance_result = await db.execute(select(Balance).where(Balance.user_id == user.id))
                balance = balance_result.scalar_one_or_none()
                credits = balance.credits if balance else 0
                
                # Проверяем, админ ли пользователь
                is_admin = telegram_user_id in settings.admin_ids
                
                keyboard = {
                    "inline_keyboard": [
                        [
                            {
                                "text": "🚀 Заказать вынос",
                                "web_app": {"url": f"{frontend_url}/app"}
                            }
                        ],
                        [
                            {
                                "text": "📦 Мои заказы",
                                "web_app": {"url": f"{frontend_url}/app/orders"}
                            }
                        ],
                        [
                            {"text": "💬 Поддержка", "callback_data": "support"}
                        ]
                    ]
                }
                
                # Добавляем кнопку админ-панели для админов
                if is_admin:
                    keyboard["inline_keyboard"].append([
                        {
                            "text": "👑 Админ-панель",
                            "web_app": {"url": f"{frontend_url}/admin"}
                        }
                    ])
                
                caption = f"""👤 **{user.name}**
💼 Баланс: **{credits} выносов**

Выберите действие 👇"""
                
                # Отправляем фото с меню
                await send_telegram_photo(
                    chat_id,
                    photo_url="https://i.ibb.co/pvLXGwbY/1766674254694d4f4e669eb.jpg",
                    caption=caption,
                    keyboard=keyboard
                )
            return {"status": "ok"}
        
        # Логика 1: Пользователь нажал /start
        elif text == "/start" or text == "/start auth":
            # Проверяем, есть ли у пользователя РЕАЛЬНЫЙ телефон в БД
            result = await db.execute(select(User).where(User.telegram_id == telegram_user_id))
            user = result.scalar_one_or_none()
            
            # Считаем телефон реальным, если он есть и НЕ начинается с +7999 (мок)
            has_real_phone = user and user.phone and not user.phone.startswith("+7999")
            
            print(f"[WEBHOOK] User exists: {bool(user)}, phone: {user.phone if user else None}, has_real_phone: {has_real_phone}")
            
            if has_real_phone:
                # Уже зарегистрирован с реальным телефоном, даем полное меню
                frontend_url = settings.FRONTEND_URL
                
                # Получаем баланс пользователя
                balance_result = await db.execute(select(Balance).where(Balance.user_id == user.id))
                balance = balance_result.scalar_one_or_none()
                credits = balance.credits if balance else 0
                
                # Проверяем, админ ли пользователь
                is_admin = telegram_user_id in settings.admin_ids
                
                keyboard = {
                    "inline_keyboard": [
                        [
                            {
                                "text": "🚀 Заказать вынос",
                                "web_app": {"url": f"{frontend_url}/app"}
                            }
                        ],
                        [
                            {
                                "text": "📦 Мои заказы",
                                "web_app": {"url": f"{frontend_url}/app/orders"}
                            }
                        ],
                        [
                            {"text": "💬 Поддержка", "callback_data": "support"}
                        ]
                    ]
                }
                
                # Добавляем кнопку админ-панели для админов
                if is_admin:
                    keyboard["inline_keyboard"].append([
                        {
                            "text": "👑 Админ-панель",
                            "web_app": {"url": f"{frontend_url}/admin"}
                        }
                    ])
                
                # Отправляем фото с приветствием
                caption = f"""👋 **С возвращением, {user.name}!**

💼 Баланс: **{credits} выносов**

Выберите действие 👇"""
                
                await send_telegram_photo(
                    chat_id,
                    photo_url="https://i.ibb.co/pvLXGwbY/1766674254694d4f4e669eb.jpg",
                    caption=caption,
                    keyboard=keyboard
                )
            else:
                # Новый пользователь или без реального телефона
                # Отправляем 3 слайда-приветствия
                await send_welcome_slides(chat_id)
                
                # Затем просим контакт
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
                
                welcome_text = """👋 **Привет! Это сервис «Я УБЕРУ»**

Я выношу ваш бытовой мусор в удобное для вас время — по подписке или разово.

♻️ **Что вы можете сделать:**
• Оформить подписку на вынос бытового мусора
• Выбрать удобные дни и время
• Заказать разовый вынос
• Отслеживать статус услуги

👉 Чтобы начать, поделитесь номером телефона 👇"""
                
                await send_telegram_message(chat_id, welcome_text, keyboard)
            
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
            frontend_url = settings.FRONTEND_URL
            
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
