import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Load env from parent directory (where .env is likely located relative to backend root)
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# Fallback or get from env
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not found in environment!")
    # Try to construct if user provided postgresql://... previously
    # Using the one from memory if available or asking user.
    # From conversation history: postgresql://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway
    DATABASE_URL = "postgresql+asyncpg://postgres:DWdJwwGfiRKHwSVdaLJrkbxrFpXkfZHd@yamabiko.proxy.rlwy.net:49018/railway"
    print(f"⚠️ Using fallback DATABASE_URL: {DATABASE_URL}")

async def apply_migration():
    if not DATABASE_URL:
        return
        
    engine = create_async_engine(DATABASE_URL)
    
    print("🔌 Connecting to database...")
    async with engine.begin() as conn:
        print("🚀 Applying migration: add_username.sql")
        with open('migrations/add_username.sql', 'r') as f:
            sql = f.read()
            await conn.execute(text(sql))
        print("✅ Migration applied successfully!")

if __name__ == "__main__":
    asyncio.run(apply_migration())
