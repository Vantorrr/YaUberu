# 🚀 Инструкция по деплою "Я УБЕРУ"

## ✅ Текущий статус

Все компоненты системы готовы к продакшену:
- ✅ Backend (FastAPI) - полностью функционален
- ✅ Frontend (Next.js) - оптимизирован и готов
- ✅ Client Bot - интерактивное меню, уведомления
- ✅ Courier Bot - полная интеграция с API
- ✅ Admin Panel - управление заказами, курьерами, ЖК
- ✅ PostgreSQL - база данных настроена

---

## 🏗️ Архитектура на Railway

### 4 сервиса:

1. **PostgreSQL** (Database)
2. **Backend** (FastAPI)
3. **Frontend** (Next.js)
4. **Courier Bot** (Aiogram)

**Client Bot** работает через webhook на Backend.

---

## 📦 Быстрый деплой

### 1. PostgreSQL
```
Service: PostgreSQL
Auto-deploy: Enabled
```

После создания сохрани **DATABASE_URL** из переменных.

### 2. Backend
```
Repository: https://github.com/Vantorrr/YaUberu.git
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Environment Variables:**
```
DATABASE_URL=<из PostgreSQL сервиса>
TELEGRAM_BOT_TOKEN=7159771456:AAG-KEUlGCGy3S7vy58FNM3LmMaf8oMXUh4
TELEGRAM_COURIER_BOT_TOKEN=8372253922:AAGANSfPVW1qXohb13GEydrl0LVF5pjKzg
SECRET_KEY=ya-uberu-production-secret-key-2024
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
FRONTEND_URL=<URL фронтенда после деплоя>
ADMIN_TELEGRAM_IDS=777333892
SUPPORT_USERNAME=YaUberu_AppBot
SUPPORT_PHONE=+79999999999
DEBUG=False
```

### 3. Frontend
```
Repository: https://github.com/Vantorrr/YaUberu.git
Root Directory: frontend
Build Command: npm install && npm run build
Start Command: npm start -- -p $PORT
```

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=<URL Backend'а>
```

### 4. Courier Bot
```
Repository: https://github.com/Vantorrr/YaUberu.git
Root Directory: courier-bot
Build Command: pip install -r requirements.txt
Start Command: python bot.py
```

**Environment Variables:**
```
TELEGRAM_BOT_TOKEN=8372253922:AAGANSfPVW1qXohb13GEydrl0LVF5pjKzg
API_BASE_URL=<URL Backend'а>
```

---

## ⚙️ Настройка Telegram Бота

### Client Bot (@YaUberu_AppBot)

1. Открой BotFather: https://t.me/BotFather
2. Отправь `/setwebhook`
3. Выбери `@YaUberu_AppBot`
4. Установи webhook:
```
https://<BACKEND_URL>/api/client-bot/webhook
```

5. Настрой Mini App:
```
/setmenubutton -> @YaUberu_AppBot
Title: Открыть приложение
URL: https://<FRONTEND_URL>
```

### Courier Bot (@YaUberu_TeamBot)

Работает через long polling (автоматически). Webhook НЕ нужен.

---

## 🧪 Тестирование

### 1. Client Flow
- Открой https://t.me/YaUberu_AppBot
- Нажми `/start` → должно появиться меню с фото
- Нажми "Заказать вынос" → откроется Web App
- Выбери ЖК → нажми на кнопку (НЕ select!)
- Заполни адрес → выбери время → подтверди
- Проверь что заказ появился в "Мои заказы"

### 2. Courier Flow
- Открой https://t.me/YaUberu_TeamBot
- Нажми `/start` → главное меню
- "Мои задачи" → выбери ЖК → выбери дом → возьми заказ
- "Взял в работу" → укажи количество мешков → "Вынесено"
- Проверь что клиент получил уведомление

### 3. Admin Panel
- Открой клиентский бот от админа (Telegram ID в ADMIN_TELEGRAM_IDS)
- Нажми "Админ-панель" в главном меню
- Проверь статистику, назначение курьеров, добавление ЖК

---

## 🔥 Основные фичи

### ✅ Реализовано:
- Telegram Native авторизация (Share Contact)
- Геолокация (кнопка "Моя локация")
- Выбор ЖК через кнопки (вместо select)
- Срочный вынос (в течение часа, +150₽)
- Выбор способа передачи мусора (У двери/В руки)
- Кредитная система (банк выносов)
- Уведомления клиентам и курьерам
- Реальная статистика курьеров
- Scheduler для автогенерации подписок
- Админ-панель с полным управлением
- Rich меню для клиента и курьера
- Full-screen Web App
- Анимации и профессиональный UI

### 🚧 На будущее:
- Геокодирование (Яндекс.Карты API)
- Интеграция оплаты (ЮKassa/T-Bank)
- Реферальная система
- Push-уведомления
- Рейтинг курьеров

---

## 🐛 Возможные проблемы

### 1. Frontend: "Application failed to respond"
**Решение:** Убедись что Start Command: `npm start -- -p $PORT` (НЕ `npm start`)

### 2. Backend: Python version mismatch
**Решение:** Добавь файл `.python-version` с содержимым `3.11`

### 3. Client bot не отвечает
**Решение:** 
- Проверь webhook: `/getwebhookinfo` в BotFather
- Убедись что `TELEGRAM_BOT_TOKEN` установлен в Backend

### 4. Select не работает в Web App
**Решение:** Используй кнопки! Селекты НЕ поддерживаются Telegram WebApp.

---

## 📊 Мониторинг

### Railway Logs
Каждый сервис имеет свои логи:
- Backend: `[ORDER]`, `[LOCATION]`, `[AUTH]` префиксы
- Courier Bot: `[BOT]`, `[API]` префиксы
- Frontend: Next.js build logs

### Telegram Bot Logs
- Client Bot: логи в Backend (`/api/client-bot/webhook`)
- Courier Bot: логи в отдельном сервисе

---

## 🎉 Финал

После деплоя проверь:
1. ✅ Frontend доступен и открывается в Telegram
2. ✅ Client Bot отвечает на `/start`
3. ✅ Courier Bot показывает задачи
4. ✅ Админ-панель доступна для админа
5. ✅ Заказы синхронизируются между всеми сервисами

**Всё готово к запуску!** 🚀

---

## 💰 Цена реализации: 120,000₽
Срок: 14-18 дней

**Контакты для поддержки:**
- Telegram: @YaUberu_AppBot
- GitHub: https://github.com/Vantorrr/YaUberu

