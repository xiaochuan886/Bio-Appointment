-- Add cancelled_reason and cancelled_at fields to appointments table
ALTER TABLE appointments 
ADD COLUMN cancelled_reason TEXT,
ADD COLUMN cancelled_at TIMESTAMP;

-- Add comment to explain the purpose of these fields
COMMENT ON COLUMN appointments.cancelled_reason IS 'Reason why the appointment was cancelled';
COMMENT ON COLUMN appointments.cancelled_at IS 'Timestamp when the appointment was cancelled';