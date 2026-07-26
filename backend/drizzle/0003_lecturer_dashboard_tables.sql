-- Lecturer dashboard: teaching sessions, timetable, syllabus topics
CREATE TABLE IF NOT EXISTS "teaching_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"subject_code" varchar(30) NOT NULL,
	"topic" text NOT NULL,
	"duration_hours" numeric(6, 2) NOT NULL,
	"session_date" date NOT NULL,
	"session_time" varchar(20) DEFAULT '09:00' NOT NULL,
	"status" varchar(20) DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teaching_sessions_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturers"("id") ON DELETE cascade,
	CONSTRAINT "teaching_sessions_duration_check" CHECK (duration_hours > (0)::numeric),
	CONSTRAINT "teaching_sessions_status_check" CHECK ((status)::text = ANY ((ARRAY['Pending'::character varying, 'Approved'::character varying])::text[]))
);

CREATE INDEX IF NOT EXISTS "idx_teaching_sessions_lecturer" ON "teaching_sessions" USING btree ("lecturer_id");
CREATE INDEX IF NOT EXISTS "idx_teaching_sessions_date" ON "teaching_sessions" USING btree ("session_date" DESC);

CREATE TABLE IF NOT EXISTS "lecture_schedules" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"subject_code" varchar(30) NOT NULL,
	"room" varchar(100) NOT NULL,
	"session_date" date NOT NULL,
	"start_time" varchar(20) NOT NULL,
	"end_time" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lecture_schedules_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturers"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_lecture_schedules_lecturer" ON "lecture_schedules" USING btree ("lecturer_id");
CREATE INDEX IF NOT EXISTS "idx_lecture_schedules_date" ON "lecture_schedules" USING btree ("session_date");

CREATE TABLE IF NOT EXISTS "syllabus_topics" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"subject_code" varchar(30) NOT NULL,
	"topic_title" text NOT NULL,
	"week_number" integer DEFAULT 1 NOT NULL,
	"sequence_no" integer DEFAULT 1 NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_syllabus_topics_subject" ON "syllabus_topics" USING btree ("subject_code");

CREATE TABLE IF NOT EXISTS "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"subject_code" varchar(30) NOT NULL,
	"session_date" date NOT NULL,
	"present_student_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"absent_student_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_sessions_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturers"("id") ON DELETE cascade,
	CONSTRAINT "uq_attendance_session_lecturer_subject_date" UNIQUE ("lecturer_id", "subject_code", "session_date")
);

CREATE INDEX IF NOT EXISTS "idx_attendance_sessions_lecturer" ON "attendance_sessions" USING btree ("lecturer_id");
CREATE INDEX IF NOT EXISTS "idx_attendance_sessions_subject_date" ON "attendance_sessions" USING btree ("subject_code", "session_date" DESC);
