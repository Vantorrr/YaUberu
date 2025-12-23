# 🔧 Настройка Environment Variables

## 📁 Backend (FastAPI)

Создай файл `backend/.env`:

```bash
# Database
DATABASE_URL=sqlite+aiosqlite:///./sql_app.db
# Для PostgreSQL (Railway/Production):
# DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname

# JWT Settings
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Telegram Bots
TELEGRAM_BOT_TOKEN=7159771456:AAG-KEUlGCGy3S7vy58FNM3LmMaf8oMXUh4
TELEGRAM_COURIER_BOT_TOKEN=8372253922:AAGANSfPVW1qXohb13GEydrl0LVF5pjKzg

# Frontend URL (для редиректов из бота)
FRONTEND_URL=http://localhost:3000

# Admin Telegram IDs (через запятую)
ADMIN_TELEGRAM_IDS=777333892,8141463258

# Support контакты
SUPPORT_USERNAME=YaUberu_AppBot
SUPPORT_PHONE=+79999999999

# Debug mode
DEBUG=True

# CORS Origins (через запятую или "*")
ALLOWED_ORIGINS=*

# App Info
APP_NAME=Я УБЕРУ API
```

---

## 📁 Frontend (Next.js)

Создай файл `frontend/.env.local`:

```bash
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8080/api

# Для production (Railway):
# NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app/api
```

---

## 📁 Courier Bot (Aiogram)

Создай файл `courier-bot/.env`:

```bash
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=8372253922:AAGANSfPVW1qXohb13GEydrl0LVF5pjKzg

# Backend API URL
API_BASE_URL=http://localhost:8080/api

# Для production (Railway):
# API_BASE_URL=https://your-backend-url.up.railway.app/api

# Admin Telegram IDs (через запятую)
ADMIN_TELEGRAM_IDS=777333892,8141463258

# Support контакты
SUPPORT_USERNAME=YaUberu_AppBot
SUPPORT_PHONE=+79999999999
```

---

## 🚀 Быстрая настройка

### 1. Backend
```bash
cd backend
cp env.example.txt .env
# Отредактируй .env под себя
```

### 2. Frontend
```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:8080/api" > .env.local
```

### 3. Courier Bot
```bash
cd courier-bot
cp env.example.txt .env
# Отредактируй .env под себя
```

---

## ⚠️ Важно!

- ❌ **НЕ коммить** `.env` файлы в Git!
- ✅ Они уже в `.gitignore`
- ✅ Используй `.env.example` для шаблонов
- ✅ Для Railway используй UI для переменных окружения

---

## 🔐 Production Secrets

Для продакшена на Railway:
- `SECRET_KEY` - сгенерируй новый: `openssl rand -hex 32`
- `DEBUG` - установи в `False`
- `ALLOWED_ORIGINS` - укажи реальный домен фронтенда
- `DATABASE_URL` - возьми из Railway PostgreSQL сервиса


