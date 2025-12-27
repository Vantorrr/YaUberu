-- Migration: Add subscription period fields
-- Created: 2025-12-27
-- Description: Add start_date, end_date, frequency to subscriptions table

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS frequency VARCHAR(20);

