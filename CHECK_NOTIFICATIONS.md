# 🔍 ПРОВЕРКА УВЕДОМЛЕНИЙ - ЧТО ДЕЛАТЬ

## ⚠️ ПРОБЛЕМА: УВЕДОМЛЕНИЯ НЕ ПРИХОДЯТ

---

## 1️⃣ ПРОВЕРЬ RAILWAY VARIABLES

Зайди в **Railway → Backend Service → Variables**

**ДОЛЖНЫ БЫТЬ:**
```
TELEGRAM_BOT_TOKEN=7159771456:AAG-KEUlGCGy3S7vy58FNM3LmMaf8oMXUh4
TELEGRAM_COURIER_BOT_TOKEN=8372253922:AAGANSfPVW1qXohb13GEydrl0LVF5pjKzg
ADMIN_TELEGRAM_IDS=8141463258,574160946,622899263,353392922,443823398
```

### ❌ ЕСЛИ `TELEGRAM_COURIER_BOT_TOKEN` НЕТ:
**ДОБАВЬ ЕГО:**
1. Railway → твой backend сервис
2. Variables
3. New Variable
4. `TELEGRAM_COURIER_BOT_TOKEN` = `8372253922:AAGANSfPVW1qXohb13GEydrl0LVF5pjKzg`
5. Save
6. **RESTART** сервис

---

## 2️⃣ ПРОВЕРЬ ЛОГИ BACKEND

Railway → Backend → Logs

**ЧТО ИСКАТЬ:**
```
[NOTIFY] Sending order #123 to 3 couriers via COURIER BOT
[NOTIFY] ✅ Courier 8141463258 notified
[NOTIFY] ❌ Failed to notify courier 574160946
```

### Если видишь:
- `Skipping notification: token=False` → **ТОКЕН НЕ УСТАНОВЛЕН!**
- `Response: 401 Unauthorized` → **ТОКЕН НЕПРАВИЛЬНЫЙ!**
- `Connection refused` → **БОТ НЕ ЗАПУЩЕН!**

---

## 3️⃣ ПРОВЕРЬ БОТЫ

### Courier Bot:
1. Открой [@YaUberu_TeamBot](https://t.me/YaUberu_TeamBot)
2. Напиши `/start`
3. Должно прийти приветствие

### Client Bot:
1. Открой [@YaUberu_AppBot](https://t.me/YaUberu_AppBot)
2. Напиши `/start`
3. Должно открыться Mini App

---

## 4️⃣ ВРЕМЕННОЕ РЕШЕНИЕ

### Если не работает - используй ОДИН БОТ для всех:

В Railway → Backend Variables:
```
TELEGRAM_COURIER_BOT_TOKEN=7159771456:AAG-KEUlGCGy3S7vy58FNM3LmMaf8oMXUh4
```

(тот же что и `TELEGRAM_BOT_TOKEN`)

**⚠️ Это не идеально, но будет работать!**

---

## 5️⃣ ПРОТЕСТИРУЙ

После изменений:
1. Restart backend на Railway
2. Подожди 30 секунд
3. Создай заказ в приложении
4. Смотри логи:
   - Должно быть: `[NOTIFY] ✅ Admin XXXXX notified`
   - Должно быть: `[NOTIFY] ✅ Courier XXXXX notified`

---

## 🆘 ЕСЛИ НЕ ПОМОГЛО

Скинь мне:
1. Скриншот Railway Variables (backend)
2. Логи backend после создания заказа
3. ID админа который должен получить уведомление

