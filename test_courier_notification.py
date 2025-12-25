"""
Тестовая отправка уведомления через курьерский бот
"""
import requests

# Токен курьерского бота
COURIER_BOT_TOKEN = "8372253922:AAGANSfPVbW1qXohb13GEydrl0LVL5pjKzg"

# Твой Telegram ID (первый админ из списка)
YOUR_TELEGRAM_ID = 8141463258

# Тестовое сообщение
test_message = """
🧪 **ТЕСТОВОЕ УВЕДОМЛЕНИЕ**

Это тестовое сообщение от курьерского бота!

Если ты видишь это - токен работает! ✅
"""

def send_test_notification():
    url = f"https://api.telegram.org/bot{COURIER_BOT_TOKEN}/sendMessage"
    
    payload = {
        "chat_id": YOUR_TELEGRAM_ID,
        "text": test_message,
        "parse_mode": "Markdown"
    }
    
    print(f"🚀 Отправляю тестовое уведомление...")
    print(f"📱 Telegram ID: {YOUR_TELEGRAM_ID}")
    print(f"🤖 Бот: @YaUberu_TeamBot")
    print(f"🔑 Токен: {COURIER_BOT_TOKEN[:20]}...")
    print("-" * 50)
    
    response = requests.post(url, json=payload)
    
    print(f"📊 Статус: {response.status_code}")
    print(f"📄 Ответ: {response.json()}")
    print("-" * 50)
    
    if response.status_code == 200:
        print("✅ УСПЕХ! Проверь телеграм!")
    else:
        print("❌ ОШИБКА! Смотри детали выше")
        if response.status_code == 401:
            print("⚠️  401 = Неправильный токен!")
        elif response.status_code == 400:
            print("⚠️  400 = Неправильный chat_id или бот заблокирован пользователем")

if __name__ == "__main__":
    send_test_notification()

