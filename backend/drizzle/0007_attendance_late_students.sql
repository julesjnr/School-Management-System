ALTER TABLE "attendance_sessions"
ADD COLUMN IF NOT EXISTS "late_student_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
