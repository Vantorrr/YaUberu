-- ========================================
-- FINAL MIGRATION: Fix all missing columns
-- Date: 2024-12-24
-- ========================================

-- 1. FIX ADDRESSES TABLE
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS street VARCHAR(200);
ALTER TABLE addresses ALTER COLUMN complex_id DROP NOT NULL;

-- 2. FIX SUBSCRIPTIONS TABLE
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS address_id INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_generated_date DATE;

-- 3. VERIFY ALL TABLES
-- Run these queries to check:

-- Check addresses:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'addresses' ORDER BY ordinal_position;

-- Check subscriptions:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'subscriptions' ORDER BY ordinal_position;

-- ========================================
-- DONE! Now restart the backend service.
-- ========================================

