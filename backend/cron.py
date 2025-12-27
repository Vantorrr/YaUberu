#!/usr/bin/env python3
"""
Cron job script for running the scheduler on Railway.

This script should be scheduled to run daily at 6:00 AM.
Railway: Add as a cron service or use Railway's cron jobs feature.
"""
import asyncio
import sys
from datetime import date

# Add the app directory to the path
sys.path.insert(0, '/app')

from app.services.scheduler import generate_orders_for_today


async def main():
    print(f"[CRON] Starting scheduler for {date.today()}")
    try:
        generated, skipped = await generate_orders_for_today()
        print(f"[CRON] Completed successfully! Generated: {generated}, Skipped: {skipped}")
        return 0
    except Exception as e:
        print(f"[CRON] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

