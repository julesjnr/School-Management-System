-- Production academics and admissions extension. Existing course records remain valid.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS department varchar(255);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS intake varchar(100);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS study_mode varchar(50);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS application_fee numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS entry_requirements text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_content text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_highlights text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS archived_by varchar(255);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'pending';
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS reviewed_by varchar(255);
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS uq_course_reviews_student_course ON course_reviews(student_id, course_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS course_gallery_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  image_url text NOT NULL, caption varchar(500), display_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false, is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_gallery_course ON course_gallery_images(course_id, display_order);
CREATE UNIQUE INDEX IF NOT EXISTS uq_course_featured_image ON course_gallery_images(course_id) WHERE is_featured;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), request_no varchar(40) NOT NULL UNIQUE,
  full_name varchar(255) NOT NULL, email varchar(255) NOT NULL, phone varchar(50) NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL, course_name varchar(255), consultation_type varchar(30) NOT NULL,
  preferred_date date NOT NULL, preferred_time varchar(50) NOT NULL, message text NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'pending', scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_consultations_status_created ON consultations(status, created_at DESC);
CREATE TABLE IF NOT EXISTS consultation_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  direction varchar(20) NOT NULL, sender_name varchar(255), sender_email varchar(255), body text NOT NULL,
  message_id varchar(255) UNIQUE, in_reply_to varchar(255), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_thread ON consultation_messages(consultation_id, created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), application_no varchar(40) NOT NULL UNIQUE,
  full_name varchar(255) NOT NULL, national_id varchar(100) NOT NULL, date_of_birth date NOT NULL,
  gender varchar(30) NOT NULL, nationality varchar(100) NOT NULL, phone varchar(50) NOT NULL, email varchar(255) NOT NULL,
  postal_address text NOT NULL, previous_school varchar(255) NOT NULL, highest_qualification varchar(255) NOT NULL,
  mean_grade varchar(50) NOT NULL, graduation_year integer NOT NULL,
  first_choice_course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  second_choice_course_id uuid REFERENCES courses(id) ON DELETE SET NULL, preferred_intake varchar(100) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'submitted', admission_no varchar(50) UNIQUE,
  approved_course_id uuid REFERENCES courses(id) ON DELETE RESTRICT, internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz, decided_by varchar(255)
);
CREATE INDEX IF NOT EXISTS idx_applications_status_created ON applications(status, created_at DESC);
CREATE TABLE IF NOT EXISTS application_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type varchar(60) NOT NULL, file_name varchar(255) NOT NULL, mime_type varchar(100) NOT NULL,
  file_url text NOT NULL, size_bytes integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS application_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  note text NOT NULL, created_by varchar(255), created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS outstanding_balance numeric(12,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_no varchar(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by varchar(255);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_receipt_no ON payments(receipt_no) WHERE receipt_no IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), event_key varchar(255) NOT NULL UNIQUE,
  recipient varchar(255) NOT NULL, subject varchar(500) NOT NULL, body text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'queued', attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz, last_error text
);
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), actor_id varchar(255), actor_role varchar(50),
  action varchar(100) NOT NULL, resource_type varchar(100) NOT NULL, resource_id varchar(255),
  details jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_resource ON admin_audit_logs(resource_type, resource_id, created_at DESC);
