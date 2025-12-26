-- Migration: Add complex_buildings table
-- Created: 2025-12-26
-- Description: Add ability to specify building numbers for each residential complex

CREATE TABLE IF NOT EXISTS complex_buildings (
    id SERIAL PRIMARY KEY,
    complex_id INTEGER NOT NULL REFERENCES residential_complexes(id) ON DELETE CASCADE,
    building_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_complex_buildings_complex_id ON complex_buildings(complex_id);

