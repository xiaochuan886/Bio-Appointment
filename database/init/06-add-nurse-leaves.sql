-- Bio-Appointment Nurse Leave Management Database Schema
-- This script adds nurse leave management functionality

-- Create leave_period enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_period') THEN
        CREATE TYPE leave_period AS ENUM ('morning', 'afternoon', 'full_day');
    END IF;
END $$;

-- Create nurse_leaves table
CREATE TABLE IF NOT EXISTS nurse_leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nurse_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    leave_date DATE NOT NULL,
    leave_period leave_period NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no duplicate leave for same nurse on same date and period
    UNIQUE(nurse_id, leave_date, leave_period)
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_nurse_leaves_nurse_id ON nurse_leaves(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_leaves_date ON nurse_leaves(leave_date);
CREATE INDEX IF NOT EXISTS idx_nurse_leaves_nurse_date ON nurse_leaves(nurse_id, leave_date);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_nurse_leaves_updated_at BEFORE UPDATE ON nurse_leaves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger for nurse_leaves table
CREATE TRIGGER audit_nurse_leaves_trigger AFTER INSERT OR UPDATE OR DELETE ON nurse_leaves
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Add comments for documentation
COMMENT ON TABLE nurse_leaves IS '护士休假记录表，存储护士的休假安排';
COMMENT ON COLUMN nurse_leaves.nurse_id IS '护士ID，关联到profiles表';
COMMENT ON COLUMN nurse_leaves.leave_date IS '休假日期';
COMMENT ON COLUMN nurse_leaves.leave_period IS '休假时段：morning-上午，afternoon-下午，full_day-全天';
COMMENT ON COLUMN nurse_leaves.reason IS '休假原因';
COMMENT ON COLUMN nurse_leaves.created_by IS '创建人ID，通常是护士长或管理员';

-- Create a function to check if a nurse is on leave for a specific date and time
CREATE OR REPLACE FUNCTION is_nurse_on_leave(
    p_nurse_id UUID,
    p_date DATE,
    p_time TIME DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    leave_exists BOOLEAN;
    leave_pd leave_period;
BEGIN
    -- Check for full day leave
    SELECT EXISTS(
        SELECT 1 FROM nurse_leaves
        WHERE nurse_id = p_nurse_id
        AND leave_date = p_date
        AND leave_period = 'full_day'
    ) INTO leave_exists;
    
    IF leave_exists THEN
        RETURN TRUE;
    END IF;
    
    -- If time is provided, check for specific period
    IF p_time IS NOT NULL THEN
        -- Morning: before 12:00
        -- Afternoon: after 12:00
        IF p_time < '12:00:00' THEN
            leave_pd := 'morning';
        ELSE
            leave_pd := 'afternoon';
        END IF;
        
        SELECT EXISTS(
            SELECT 1 FROM nurse_leaves
            WHERE nurse_id = p_nurse_id
            AND leave_date = p_date
            AND leave_period = leave_pd
        ) INTO leave_exists;
        
        RETURN leave_exists;
    END IF;
    
    -- If no time specified, check if there's any leave on that day
    SELECT EXISTS(
        SELECT 1 FROM nurse_leaves
        WHERE nurse_id = p_nurse_id
        AND leave_date = p_date
    ) INTO leave_exists;
    
    RETURN leave_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get conflicting schedules for a nurse's leave
CREATE OR REPLACE FUNCTION get_conflicting_schedules_for_leave(
    p_nurse_id UUID,
    p_leave_date DATE,
    p_leave_period leave_period
) RETURNS TABLE (
    schedule_id UUID,
    appointment_id UUID,
    scheduled_time_start TIME,
    scheduled_time_end TIME,
    customer_name VARCHAR(255),
    service_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.appointment_id,
        s.scheduled_time_start,
        s.scheduled_time_end,
        a.customer_name,
        srv.name as service_name
    FROM schedules s
    INNER JOIN appointments a ON s.appointment_id = a.id
    LEFT JOIN services srv ON a.service_id = srv.id
    WHERE s.nurse_id = p_nurse_id
    AND s.scheduled_date = p_leave_date
    AND s.status NOT IN ('cancelled', 'completed')
    AND (
        p_leave_period = 'full_day'
        OR (p_leave_period = 'morning' AND s.scheduled_time_start < '12:00:00')
        OR (p_leave_period = 'afternoon' AND s.scheduled_time_start >= '12:00:00')
    )
    ORDER BY s.scheduled_time_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION is_nurse_on_leave TO app_user;
GRANT EXECUTE ON FUNCTION get_conflicting_schedules_for_leave TO app_user;

-- Create a view for easy querying of nurse leaves with details
CREATE OR REPLACE VIEW nurse_leaves_with_details AS
SELECT 
    nl.id,
    nl.nurse_id,
    nl.leave_date,
    nl.leave_period,
    nl.reason,
    nl.created_at,
    nl.updated_at,
    p.full_name as nurse_name,
    p.username as nurse_username,
    p.store_id,
    s.name as store_name,
    creator.full_name as created_by_name
FROM nurse_leaves nl
INNER JOIN profiles p ON nl.nurse_id = p.id
LEFT JOIN stores s ON p.store_id = s.id
LEFT JOIN profiles creator ON nl.created_by = creator.id;

-- Grant permissions on the view
GRANT SELECT ON nurse_leaves_with_details TO app_user;
