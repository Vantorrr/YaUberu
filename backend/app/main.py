from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from app.config import settings
from app.api import auth, orders, users, admin, courier, client_bot, payments
from app.models.base import Base, engine
from app.services.scheduler import generate_orders_for_today
# Import models to ensure they are registered with Base
from app import models

# ============== DEBUG: PRINT BOT TOKENS AT STARTUP ==============
print("=" * 60)
print("🚀 YA UBERU BACKEND STARTING")
print("=" * 60)
print(f"[TOKENS] CLIENT BOT: {settings.TELEGRAM_BOT_TOKEN[:30] if settings.TELEGRAM_BOT_TOKEN else '❌ EMPTY'}...")
print(f"[TOKENS] COURIER BOT: {settings.TELEGRAM_COURIER_BOT_TOKEN[:30] if settings.TELEGRAM_COURIER_BOT_TOKEN else '❌ EMPTY'}...")
print(f"[TOKENS] ADMIN IDS: {settings.admin_ids}")
print("=" * 60)


async def scheduler_background_task():
    """
    Background task that runs the scheduler every day at 6:00 AM.
    For Railway/production this can be replaced with a cron job.
    """
    import datetime
    
    while True:
        now = datetime.datetime.now()
        # Calculate seconds until next 6:00 AM
        target = now.replace(hour=6, minute=0, second=0, microsecond=0)
        if now >= target:
            target += datetime.timedelta(days=1)
        
        wait_seconds = (target - now).total_seconds()
        print(f"[SCHEDULER] Next run in {wait_seconds/3600:.1f} hours at {target}")
        
        await asyncio.sleep(wait_seconds)
        
        # Run scheduler
        try:
            print("[SCHEDULER] Running daily order generation...")
            generated, skipped = await generate_orders_for_today()
            print(f"[SCHEDULER] Done: {generated} generated, {skipped} skipped")
        except Exception as e:
            print(f"[SCHEDULER] Error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Start background scheduler task
    scheduler_task = asyncio.create_task(scheduler_background_task())
    print("[STARTUP] Scheduler background task started")
    
    # Run scheduler once on startup (catch up for today)
    try:
        generated, skipped = await generate_orders_for_today()
        print(f"[STARTUP] Initial scheduler run: {generated} generated, {skipped} skipped")
    except Exception as e:
        print(f"[STARTUP] Initial scheduler error: {e}")
    
    yield
    
    # Shutdown: cancel scheduler
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title=settings.APP_NAME,
    description="API для сервиса выноса мусора",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for Telegram Mini App
# Parse origins from settings
allowed_origins = settings.ALLOWED_ORIGINS.split(",") if settings.ALLOWED_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(courier.router, prefix="/api/courier", tags=["Courier"])
app.include_router(client_bot.router, prefix="/api/client-bot", tags=["ClientBot"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
