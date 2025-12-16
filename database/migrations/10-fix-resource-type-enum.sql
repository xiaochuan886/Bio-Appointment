-- Migration: Fix resource_type enum to include room subtypes
-- This migration adds room subtypes to the resource_type enum
-- Date: 2025-12-12

BEGIN;

-- Create a new enum type with all required values
CREATE TYPE resource_type_new AS ENUM ('room', 'nurse', 'vip', 'treatment', 'consultation');

-- Update existing data to use 'room' for existing room resources
UPDATE resources SET type = 'room' WHERE type = 'room';

-- Update the column to use the new enum type
ALTER TABLE resources ALTER COLUMN type TYPE resource_type_new USING type::text::resource_type_new;

-- Drop the old enum type
DROP TYPE resource_type;

-- Rename the new enum type to the original name
ALTER TYPE resource_type_new RENAME TO resource_type;

-- Add comment to document enum values
COMMENT ON TYPE resource_type IS 'Resource type enum: room, nurse, vip, treatment, consultation';

COMMIT;

-- Verification query (run separately to verify):
-- SELECT unnest(enum_range(NULL::resource_type))::text as enum_values;