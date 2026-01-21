-- Add single_credits column to balances table
-- This allows users to have a separate balance for single pickups (not part of subscription)

ALTER TABLE balances ADD COLUMN IF NOT EXISTS single_credits INTEGER DEFAULT 0;

-- Update existing rows to have 0 single_credits
UPDATE balances SET single_credits = 0 WHERE single_credits IS NULL;
