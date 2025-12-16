-- Simple migration: Add room subtypes to resource_type enum
-- Date: 2025-12-12

-- First, add new enum values to existing enum
ALTER TYPE resource_type ADD VALUE 'vip';
ALTER TYPE resource_type ADD VALUE 'treatment';
ALTER TYPE resource_type ADD VALUE 'consultation';

-- Add comment to document enum values
COMMENT ON TYPE resource_type IS 'Resource type enum: room, nurse, vip, treatment, consultation';