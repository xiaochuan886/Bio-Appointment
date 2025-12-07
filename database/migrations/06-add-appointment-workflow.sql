-- Add workflow fields to appointments table
-- This migration adds workflow management fields for proper service categorization

-- Add workflow_status field to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'pending_nurse_assignment';

-- Add requires_nurse_scheduling field to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS requires_nurse_scheduling BOOLEAN DEFAULT true;

-- Add doctor_confirmed_at field for tracking doctor confirmation timestamp
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS doctor_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Add forwarded_to_nurse_at field for tracking nurse assignment timestamp
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS forwarded_to_nurse_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for new workflow fields
CREATE INDEX IF NOT EXISTS idx_appointments_workflow_status ON appointments(workflow_status);
CREATE INDEX IF NOT EXISTS idx_appointments_requires_nurse_scheduling ON appointments(requires_nurse_scheduling);

-- Update existing appointments to set proper workflow status based on service category
UPDATE appointments a
SET
    workflow_status = CASE
        WHEN s.category = 'consultation' OR s.category = 'report' THEN 'pending_doctor_confirmation'::appointment_workflow_status
        ELSE 'pending_nurse_assignment'::appointment_workflow_status
    END,
    requires_nurse_scheduling = CASE
        WHEN s.category = 'consultation' OR s.category = 'report' THEN false
        ELSE true
    END
FROM services s
WHERE a.service_id = s.id
AND a.workflow_status = 'pending_nurse_assignment'::appointment_workflow_status -- Only update default status
AND a.requires_nurse_scheduling = true; -- Only update default value

-- Add comments for documentation
COMMENT ON COLUMN appointments.workflow_status IS '预约工作流状态：pending_nurse_assignment(待护士长分配), pending_doctor_confirmation(待医生确认), doctor_confirmed(医生已确认), doctor_completed(医生已完成), nurse_scheduled(护士已排班)';
COMMENT ON COLUMN appointments.requires_nurse_scheduling IS '是否需要护士长排班：true-护理服务需要护士长排班，false-医生服务不需要护士长排班';
COMMENT ON COLUMN appointments.doctor_confirmed_at IS '医生确认时间';
COMMENT ON COLUMN appointments.forwarded_to_nurse_at IS '转发给护士长时间';