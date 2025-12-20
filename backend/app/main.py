from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.api import auth, orders, users, admin, courier
from app.models.base import Base, engine
# Import models to ensure they are registered with Base
from app import models

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown logic if needed

app = FastAPI(
    title=settings.APP_NAME,
    description="API для сервиса выноса мусора",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for Telegram Mini App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
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


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
