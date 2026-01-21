"""
Apply migration: add single_credits to balances table
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def apply_migration():
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not found in environment")
        return
    
    # Convert postgresql:// to postgresql+asyncpg://
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Remove +asyncpg for asyncpg.connect()
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    
    print(f"🔗 Connecting to database...")
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        
        # Read migration file
        with open("migrations/add_single_credits.sql", "r") as f:
            sql_lines = [line for line in f.readlines() if line.strip() and not line.strip().startswith("--")]
            sql_content = "\n".join(sql_lines)
        
        # Split by semicolon to execute commands separately
        commands = [cmd.strip() for cmd in sql_content.split(";") if cmd.strip()]
        
        print(f"📝 Executing {len(commands)} SQL commands...")
        
        for i, cmd in enumerate(commands, 1):
            print(f"  [{i}/{len(commands)}] {cmd[:80]}...")
            await conn.execute(cmd)
        
        print("✅ Migration applied successfully!")
        
        # Check result
        try:
            result = await conn.fetch("SELECT user_id, credits, single_credits FROM balances LIMIT 5")
            print(f"\n📊 Sample balances:")
            for row in result:
                print(f"  User {row['user_id']}: credits={row['credits']}, single_credits={row['single_credits']}")
        except Exception as e:
            print(f"⚠️ Could not verify: {e}")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(apply_migration())
