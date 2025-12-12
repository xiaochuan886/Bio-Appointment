-- Migration: Add doctor_id field to schedules table
-- Purpose: Fix doctor schedule view issue by adding doctor_id field to schedules table

-- Add doctor_id field to schedules table
ALTER TABLE schedules ADD COLUMN doctor_id UUID;

-- Add foreign key constraint
ALTER TABLE schedules ADD CONSTRAINT fk_schedules_doctor 
  FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_schedules_doctor_id ON schedules(doctor_id);

-- Update existing schedules for doctor services to set doctor_id from appointments
UPDATE schedules s
SET doctor_id = a.doctor_id
FROM appointments a
INNER JOIN services srv ON a.service_id = srv.id
WHERE s.appointment_id = a.id
  AND srv.category IN ('consultation', 'report')
  AND a.doctor_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN schedules.doctor_id IS 'Reference to the doctor assigned to this schedule (for consultation/report services)';