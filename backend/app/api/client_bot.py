from fastapi import APIRouter, Request
from app.config import settings
import httpx
import os

router = APIRouter()

@router.post("/webhook")
async def telegram_webhook(request: Request):
    data = await request.json()
    
    if "message" in data:
        chat_id = data["message"]["chat"]["id"]
        text = data["message"].get("text", "")
        
        if text == "/start":
            frontend_url = os.getenv("FRONTEND_URL", "https://awake-imagination-production.up.railway.app")
            
            async with httpx.AsyncClient() as client:
                url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
                payload = {
                    "chat_id": chat_id,
                    "text": "👋 **Привет! Это «Я УБЕРУ»** 🍃\n\nСервис комфортного выноса мусора.\nЧтобы начать работу, нажмите кнопку ниже 👇",
                    "parse_mode": "Markdown",
                    "reply_markup": {
                        "inline_keyboard": [[
                            {
                                "text": "🚀 Открыть приложение",
                                "web_app": {"url": frontend_url}
                            }
                        ]]
                    }
                }
                await client.post(url, json=payload)
                
    return {"status": "ok"}
