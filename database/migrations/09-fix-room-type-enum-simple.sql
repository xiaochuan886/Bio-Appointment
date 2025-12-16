-- Simple fix for room type enum
-- Add new room type values to existing resource_type enum

-- First, let's add the new enum values
ALTER TYPE resource_type ADD VALUE 'vip' AFTER 'room';
ALTER TYPE resource_type ADD VALUE 'treatment' AFTER 'vip';  
ALTER TYPE resource_type ADD VALUE 'consultation' AFTER 'treatment';

-- Update existing room records to use proper types
UPDATE resources 
SET type = CASE 
    WHEN category = 'vip' THEN 'vip'::resource_type
    WHEN category = 'consultation' THEN 'consultation'::resource_type  
    WHEN category = 'treatment' THEN 'treatment'::resource_type
    WHEN type = 'room' THEN 'treatment'::resource_type
    ELSE type
END
WHERE type = 'room' OR category IN ('vip', 'consultation', 'treatment');

-- Add comment for documentation
COMMENT ON TYPE resource_type IS 'Resource type enumeration: room, nurse, vip, treatment, consultation';