-- Bio-Appointment Database Migration
-- Fix room type enum values to match frontend expectations

-- Add missing room type values to resource_type enum
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE after type is in use
-- So we need to create a new type and migrate

-- Create new room_type enum with all required values
DO $$
BEGIN
    -- Drop the old enum if it exists (for migration retries)
    DROP TYPE IF EXISTS room_type_new;
    
    -- Create new enum with all room types
    CREATE TYPE room_type_new AS ENUM (
        'room',      -- General resource type
        'nurse',     -- Staff resource type  
        'vip',        -- VIP room type
        'treatment',  -- Treatment room type
        'consultation' -- Consultation room type
    );
    
    -- Update resources table to use new enum
    ALTER TABLE resources ALTER COLUMN type TYPE room_type_new USING 
        CASE 
            WHEN type = 'room' THEN 'room'::room_type_new
            WHEN type = 'nurse' THEN 'nurse'::room_type_new
            ELSE 'treatment'::room_type_new -- Default to treatment for any existing data
        END;
    
    -- Drop old type
    DROP TYPE resource_type;
    
    -- Rename new type to original name
    ALTER TYPE room_type_new RENAME TO resource_type;
    
    -- Update function signatures
    DROP FUNCTION IF EXISTS get_store_resources;
    
    CREATE OR REPLACE FUNCTION get_store_resources(
        p_store_id UUID,
        p_resource_type resource_type DEFAULT NULL
    ) RETURNS TABLE (
        id UUID,
        name VARCHAR(255),
        type resource_type,
        category VARCHAR(255),
        status VARCHAR(50),
        capacity INTEGER,
        location VARCHAR(255)
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            r.id,
            r.name,
            r.type,
            r.category,
            r.status,
            r.capacity,
            r.location
        FROM resources r
        WHERE r.store_id = p_store_id
        AND r.is_active = TRUE
        AND (p_resource_type IS NULL OR r.type = p_resource_type)
        ORDER BY r.type, r.name;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Grant permissions
    GRANT EXECUTE ON FUNCTION get_store_resources TO app_user;
    
    RAISE NOTICE 'Successfully updated resource_type enum with room types';
END $$;

-- Update existing room data to have proper types
UPDATE resources 
SET type = CASE 
    WHEN category = 'vip' THEN 'vip'::resource_type
    WHEN category = 'consultation' THEN 'consultation'::resource_type
    WHEN category = 'treatment' THEN 'treatment'::resource_type
    WHEN type = 'room' THEN 'treatment'::resource_type -- Default existing rooms to treatment
    ELSE type
END
WHERE type = 'room' OR category IN ('vip', 'consultation', 'treatment');

-- Add comment for documentation
COMMENT ON TYPE resource_type IS 'Resource type enumeration: room, nurse, vip, treatment, consultation';