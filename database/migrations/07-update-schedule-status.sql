-- Update schedule status enum to match business workflow
-- This migration updates the schedule_status enum to better reflect the appointment workflow

-- Drop the old enum type (this will fail if there are existing records, so we need to handle this carefully)
-- Instead, we'll create a new enum and migrate the data

-- Create new schedule status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_status_new') THEN
        CREATE TYPE schedule_status_new AS ENUM ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled');
    END IF;
END $$;

-- Add new column with new enum type
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status_new schedule_status_new DEFAULT 'pending';

-- Migrate data from old status to new status
UPDATE schedules SET status_new = 
    CASE 
        WHEN status = 'draft' THEN 'pending'
        WHEN status = 'published' THEN 'scheduled'
        WHEN status = 'locked' THEN 'in_progress'
        ELSE 'pending'
    END;

-- Drop old status column and rename new column
ALTER TABLE schedules DROP COLUMN IF EXISTS status;
ALTER TABLE schedules RENAME COLUMN status_new TO status;

-- Update the column type to use the new enum
ALTER TABLE schedules ALTER COLUMN status TYPE schedule_status_new USING status::text::schedule_status_new;

-- Drop the old enum type
DROP TYPE IF EXISTS schedule_status;

-- Rename the new enum to the original name
ALTER TYPE schedule_status_new RENAME TO schedule_status;

-- Add comments for documentation
COMMENT ON COLUMN schedules.status IS 'Schedule status: pending, scheduled, in_progress, completed, cancelled';
COMMENT ON TYPE schedule_status IS 'Schedule status enum reflecting appointment workflow';