# Я УБЕРУ 🗑️

Сервис автоматизированного выноса мусора через Telegram.

## Структура проекта

```
ya-uberu/
├── frontend/          # Telegram Mini App (Next.js + React)
├── backend/           # API сервер (FastAPI + PostgreSQL)
├── courier-bot/       # Telegram бот для курьеров (Aiogram)
└── admin-bot/         # Telegram бот для администратора
```

## Технологии

- **Frontend:** Next.js 15, React 19, Tailwind CSS, Framer Motion
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL
- **Bots:** Aiogram 3.x

## Быстрый старт

### 1. Frontend (Mini App)

```bash
cd frontend
npm install
npm run dev
```

Открыть: http://localhost:3000

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Создать .env файл
cp .env.example .env

# Запустить
uvicorn app.main:app --reload --port 8000
```

API Docs: http://localhost:8000/docs

### 3. Courier Bot

```bash
cd courier-bot
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Создать .env файл с BOT_TOKEN
cp .env.example .env

# Запустить
python bot.py
```

## Переменные окружения

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/ya_uberu
SECRET_KEY=your-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token
```

### Courier Bot (.env)
```
BOT_TOKEN=your-courier-bot-token
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/ya_uberu
```

## Цветовая палитра

- **Primary (Мятный):** #0D9488
- **Primary Light:** #5EEAD4
- **Accent (Оранжевый):** #F97316
- **Background:** #F8FFFE
- **Text:** #134E4A

## Функционал

### Клиентское приложение
- ✅ Онбординг с слайдером
- ✅ Авторизация через Telegram
- ✅ Главный экран с балансом
- ✅ Выбор тарифов
- ✅ Оформление заказа (адрес + время)
- ✅ История заказов
- ✅ Профиль пользователя

### Курьерский бот
- ✅ Список локаций с заказами
- ✅ Группировка по домам
- ✅ Ввод количества пакетов
- ✅ Защита от мисклика (5 мин на отмену)
- ✅ Статистика курьера

### Backend
- ✅ Аутентификация через Telegram
- ✅ CRUD для заказов
- ✅ Система баланса (кредиты)
- ✅ Защита от абуза пробных подписок
- ✅ Админ API

## Лицензия

Proprietary. All rights reserved.

