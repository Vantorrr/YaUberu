-- Migration: Add street field to addresses table
-- Date: 2024-12-24
-- Description: Adds street column to addresses table and makes complex_id nullable

-- Add street column
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS street VARCHAR(200);

-- Make complex_id nullable (if not already)
ALTER TABLE addresses ALTER COLUMN complex_id DROP NOT NULL;

-- Optional: Update existing records to have a default street value
-- UPDATE addresses SET street = 'Улица не указана' WHERE street IS NULL;

COMMENT ON COLUMN addresses.street IS 'Street name (улица)';

