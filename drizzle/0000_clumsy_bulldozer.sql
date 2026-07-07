-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"code" varchar(30) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"duration" varchar(50) NOT NULL,
	"fees" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"thumbnail" text,
	"faculty" varchar(100) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "courses_code_key" UNIQUE("code"),
	CONSTRAINT "courses_fees_check" CHECK (fees >= (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "course_reviews" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"course_id" uuid,
	"student_id" uuid NOT NULL,
	"student_name" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"date" date DEFAULT CURRENT_DATE NOT NULL,
	CONSTRAINT "course_reviews_rating_check" CHECK ((rating >= 1) AND (rating <= 5))
);
--> statement-breakpoint
ALTER TABLE "course_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lecturer_publications" (
	"id" serial PRIMARY KEY NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"publication_text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lecturer_publications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lecturer_research_interests" (
	"id" serial PRIMARY KEY NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"interest_text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lecturer_research_interests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "office_hour_slots" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"day" varchar(30) NOT NULL,
	"time_slot" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"student_id" uuid,
	"student_name" varchar(255),
	"student_email" varchar(255),
	"student_notes" text,
	CONSTRAINT "office_hour_slots_status_check" CHECK ((status)::text = ANY ((ARRAY['available'::character varying, 'booked'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "office_hour_slots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "student_attendance" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_code" varchar(30) NOT NULL,
	"attendance_rate" integer DEFAULT 100 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_student_subject_attendance" UNIQUE("student_id","subject_code"),
	CONSTRAINT "student_attendance_attendance_rate_check" CHECK ((attendance_rate >= 0) AND (attendance_rate <= 100))
);
--> statement-breakpoint
ALTER TABLE "student_attendance" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"date" date NOT NULL,
	CONSTRAINT "expenses_amount_check" CHECK (amount >= (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stock_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"category" varchar(100) NOT NULL,
	"location" varchar(100) NOT NULL,
	"lowest_threshold" integer DEFAULT 5 NOT NULL,
	CONSTRAINT "stock_items_lowest_threshold_check" CHECK (lowest_threshold >= 0),
	CONSTRAINT "stock_items_quantity_check" CHECK (quantity >= 0)
);
--> statement-breakpoint
ALTER TABLE "stock_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "requisitions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"staff_name" varchar(255) NOT NULL,
	"date" date NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	CONSTRAINT "requisitions_quantity_check" CHECK (quantity > 0),
	CONSTRAINT "requisitions_status_check" CHECK ((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "requisitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "testimonies" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"avatar" text
);
--> statement-breakpoint
ALTER TABLE "testimonies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"title" varchar(255) NOT NULL,
	"author" varchar(255) NOT NULL,
	"isbn" varchar(50) NOT NULL,
	"publisher" varchar(100),
	"edition" varchar(50),
	"purchase_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"rack_number" varchar(50) NOT NULL,
	"shelf_row" varchar(50) NOT NULL,
	"library_code" varchar(50) NOT NULL,
	"type" varchar(20) DEFAULT 'Physical Book' NOT NULL,
	"e_url" text,
	"copies_total" integer NOT NULL,
	"copies_available" integer NOT NULL,
	"category" varchar(100) NOT NULL,
	CONSTRAINT "books_isbn_key" UNIQUE("isbn"),
	CONSTRAINT "books_library_code_key" UNIQUE("library_code"),
	CONSTRAINT "books_copies_available_check" CHECK (copies_available >= 0),
	CONSTRAINT "books_copies_total_check" CHECK (copies_total >= 0),
	CONSTRAINT "books_type_check" CHECK ((type)::text = ANY ((ARRAY['Physical Book'::character varying, 'E-Book'::character varying])::text[])),
	CONSTRAINT "check_copies" CHECK (copies_available <= copies_total)
);
--> statement-breakpoint
ALTER TABLE "books" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"book_id" uuid NOT NULL,
	"book_title" varchar(255) NOT NULL,
	"patron_id" uuid NOT NULL,
	"patron_name" varchar(255) NOT NULL,
	"patron_role" varchar(20) NOT NULL,
	"checkout_date" date NOT NULL,
	"due_date" date NOT NULL,
	"return_date" date,
	"status" varchar(20) DEFAULT 'borrowed' NOT NULL,
	"late_fee_assessed" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	CONSTRAINT "check_dates" CHECK (due_date >= checkout_date),
	CONSTRAINT "loans_late_fee_assessed_check" CHECK (late_fee_assessed >= 0.00),
	CONSTRAINT "loans_patron_role_check" CHECK ((patron_role)::text = ANY ((ARRAY['student'::character varying, 'lecturer'::character varying])::text[])),
	CONSTRAINT "loans_status_check" CHECK ((status)::text = ANY ((ARRAY['borrowed'::character varying, 'returned'::character varying, 'overdue'::character varying, 'lost'::character varying, 'damaged'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "loans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"book_id" uuid NOT NULL,
	"book_title" varchar(255) NOT NULL,
	"patron_id" uuid NOT NULL,
	"patron_name" varchar(255) NOT NULL,
	"reservation_date" date DEFAULT CURRENT_DATE NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	CONSTRAINT "reservations_status_check" CHECK ((status)::text = ANY ((ARRAY['pending'::character varying, 'fulfilled'::character varying, 'cancelled'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reading_lists" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"subject_code" varchar(30) NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "reading_lists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "book_reviews" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"book_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"student_name" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"date" date DEFAULT CURRENT_DATE NOT NULL,
	CONSTRAINT "book_reviews_rating_check" CHECK ((rating >= 1) AND (rating <= 5))
);
--> statement-breakpoint
ALTER TABLE "book_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "book_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"title" varchar(255) NOT NULL,
	"author" varchar(255) NOT NULL,
	"isbn" varchar(50),
	"suggested_by" varchar(255) NOT NULL,
	"suggestor_role" varchar(20) NOT NULL,
	"date" date DEFAULT CURRENT_DATE NOT NULL,
	"reason" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"admin_feedback" text,
	CONSTRAINT "book_requests_status_check" CHECK ((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])),
	CONSTRAINT "book_requests_suggestor_role_check" CHECK ((suggestor_role)::text = ANY ((ARRAY['student'::character varying, 'lecturer'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "book_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "exam_papers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"title" varchar(255) NOT NULL,
	"subject_code" varchar(30) NOT NULL,
	"year" integer NOT NULL,
	"semester" varchar(50) NOT NULL,
	"exam_type" varchar(50) NOT NULL,
	"download_url" text NOT NULL,
	"downloads_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "exam_papers_exam_type_check" CHECK ((exam_type)::text = ANY ((ARRAY['Midterm'::character varying, 'Final'::character varying, 'National Exam (KCSE/IGCSE)'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "exam_papers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "teacher_resources" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"serial_no" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"reserved_by_lecturer_id" uuid,
	"reserved_by_lecturer_name" varchar(255),
	"reservation_date" date,
	CONSTRAINT "teacher_resources_serial_no_key" UNIQUE("serial_no"),
	CONSTRAINT "teacher_resources_category_check" CHECK ((category)::text = ANY ((ARRAY['Instructional Guide'::character varying, 'Lab Manual'::character varying, 'Hardware/Projector'::character varying, 'Scientific Kit'::character varying])::text[])),
	CONSTRAINT "teacher_resources_status_check" CHECK ((status)::text = ANY ((ARRAY['available'::character varying, 'reserved'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "teacher_resources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "library_gate_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"patron_name" varchar(255) NOT NULL,
	"patron_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"auth_method" varchar(50) NOT NULL,
	"gate_action" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"reason" text,
	CONSTRAINT "library_gate_logs_auth_method_check" CHECK ((auth_method)::text = ANY ((ARRAY['biometric_fingerprint'::character varying, 'biometric_facial'::character varying, 'rfid_tap'::character varying])::text[])),
	CONSTRAINT "library_gate_logs_gate_action_check" CHECK ((gate_action)::text = ANY ((ARRAY['Entry'::character varying, 'Exit'::character varying])::text[])),
	CONSTRAINT "library_gate_logs_role_check" CHECK ((role)::text = ANY ((ARRAY['student'::character varying, 'lecturer'::character varying])::text[])),
	CONSTRAINT "library_gate_logs_status_check" CHECK ((status)::text = ANY ((ARRAY['success'::character varying, 'denied'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "library_gate_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"target_user_id" uuid,
	"target_user_role" varchar(20) NOT NULL,
	"type" varchar(30) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'unread' NOT NULL,
	"date_time" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_status_check" CHECK ((status)::text = ANY ((ARRAY['unread'::character varying, 'read'::character varying])::text[])),
	CONSTRAINT "notifications_target_user_role_check" CHECK ((target_user_role)::text = ANY ((ARRAY['student'::character varying, 'lecturer'::character varying, 'accountant'::character varying, 'librarian'::character varying, 'admin'::character varying, 'all'::character varying])::text[])),
	CONSTRAINT "notifications_type_check" CHECK ((type)::text = ANY ((ARRAY['library'::character varying, 'payment'::character varying, 'announcement'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mock_emails" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"recipient_to" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" varchar(30) NOT NULL,
	"recipient_name" varchar(255) NOT NULL,
	CONSTRAINT "mock_emails_type_check" CHECK ((type)::text = ANY ((ARRAY['invoice'::character varying, 'book_due'::character varying, 'grade_posted'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "mock_emails" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "password_reset_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"date" date DEFAULT CURRENT_DATE NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"admin_feedback" text,
	"temporary_passcode" varchar(50),
	CONSTRAINT "password_reset_requests_role_check" CHECK ((role)::text = ANY ((ARRAY['student'::character varying, 'lecturer'::character varying, 'accountant'::character varying, 'librarian'::character varying, 'admin'::character varying])::text[])),
	CONSTRAINT "password_reset_requests_status_check" CHECK ((status)::text = ANY ((ARRAY['pending'::character varying, 'resolved'::character varying, 'rejected'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "password_reset_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"admission_no" varchar(50) NOT NULL,
	"cohort" varchar(50) NOT NULL,
	"avatar" text,
	"passcode" varchar(100) DEFAULT 'student123' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_email_key" UNIQUE("email"),
	CONSTRAINT "students_admission_no_key" UNIQUE("admission_no"),
	CONSTRAINT "students_email_check" CHECK ((email)::text ~~ '%@%.%'::text)
);
--> statement-breakpoint
ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lecturers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"hourly_rate" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"logged_hours" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"bank_details" text,
	"contract_length" varchar(100) NOT NULL,
	"designator_code" varchar(50) NOT NULL,
	"bio" text,
	"avatar" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_accountant" boolean DEFAULT false NOT NULL,
	"is_librarian" boolean DEFAULT false NOT NULL,
	"passcode" varchar(100) DEFAULT 'lecturer123' NOT NULL,
	CONSTRAINT "lecturers_email_key" UNIQUE("email"),
	CONSTRAINT "lecturers_designator_code_key" UNIQUE("designator_code"),
	CONSTRAINT "lecturers_email_check" CHECK ((email)::text ~~ '%@%.%'::text),
	CONSTRAINT "lecturers_hourly_rate_check" CHECK (hourly_rate >= (0)::numeric),
	CONSTRAINT "lecturers_logged_hours_check" CHECK (logged_hours >= (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "lecturers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_code" varchar(30) NOT NULL,
	"cat_score" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"exam_score" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"graded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_student_subject" UNIQUE("student_id","subject_code"),
	CONSTRAINT "grades_cat_score_check" CHECK ((cat_score >= 0.00) AND (cat_score <= 30.00)),
	CONSTRAINT "grades_exam_score_check" CHECK ((exam_score >= 0.00) AND (exam_score <= 70.00))
);
--> statement-breakpoint
ALTER TABLE "grades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"student_id" uuid NOT NULL,
	"invoice_no" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"date" date NOT NULL,
	"status" varchar(20) DEFAULT 'unpaid' NOT NULL,
	CONSTRAINT "invoices_invoice_no_key" UNIQUE("invoice_no"),
	CONSTRAINT "invoices_amount_check" CHECK (amount >= (0)::numeric),
	CONSTRAINT "invoices_status_check" CHECK ((status)::text = ANY ((ARRAY['unpaid'::character varying, 'paid'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"student_id" uuid NOT NULL,
	"invoice_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" varchar(30) NOT NULL,
	"transaction_id" varchar(100) NOT NULL,
	"date" date NOT NULL,
	"status" varchar(20) DEFAULT 'unreconciled' NOT NULL,
	CONSTRAINT "payments_transaction_id_key" UNIQUE("transaction_id"),
	CONSTRAINT "payments_amount_check" CHECK (amount > (0)::numeric),
	CONSTRAINT "payments_payment_method_check" CHECK ((payment_method)::text = ANY ((ARRAY['M-Pesa'::character varying, 'Bank Transfer'::character varying, 'Card'::character varying])::text[])),
	CONSTRAINT "payments_status_check" CHECK ((status)::text = ANY ((ARRAY['unreconciled'::character varying, 'reconciled'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "system_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_state" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reading_list_books" (
	"reading_list_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	CONSTRAINT "reading_list_books_pkey" PRIMARY KEY("reading_list_id","book_id")
);
--> statement-breakpoint
ALTER TABLE "reading_list_books" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "student_enrollments" (
	"student_id" uuid NOT NULL,
	"course_code" varchar(30) NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_enrollments_pkey" PRIMARY KEY("student_id","course_code")
);
--> statement-breakpoint
ALTER TABLE "student_enrollments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturer_publications" ADD CONSTRAINT "lecturer_publications_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "public"."lecturers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturer_research_interests" ADD CONSTRAINT "lecturer_research_interests_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "public"."lecturers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_hour_slots" ADD CONSTRAINT "office_hour_slots_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "public"."lecturers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_lists" ADD CONSTRAINT "reading_lists_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "public"."lecturers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_reviews" ADD CONSTRAINT "book_reviews_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_reviews" ADD CONSTRAINT "book_reviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_resources" ADD CONSTRAINT "teacher_resources_reserved_by_lecturer_id_fkey" FOREIGN KEY ("reserved_by_lecturer_id") REFERENCES "public"."lecturers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_list_books" ADD CONSTRAINT "reading_list_books_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_list_books" ADD CONSTRAINT "reading_list_books_reading_list_id_fkey" FOREIGN KEY ("reading_list_id") REFERENCES "public"."reading_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_courses_code" ON "courses" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_books_isbn" ON "books" USING btree ("isbn" text_ops);--> statement-breakpoint
CREATE INDEX "idx_loans_patron" ON "loans" USING btree ("patron_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_loans_status" ON "loans" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_gate_logs_timestamp" ON "library_gate_logs" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_target" ON "notifications" USING btree ("target_user_id" text_ops,"target_user_role" text_ops);--> statement-breakpoint
CREATE INDEX "idx_students_admission" ON "students" USING btree ("admission_no" text_ops);--> statement-breakpoint
CREATE INDEX "idx_students_email" ON "students" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_lecturers_email" ON "lecturers" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_grades_student" ON "grades" USING btree ("student_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_invoices_student" ON "invoices" USING btree ("student_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_payments_student" ON "payments" USING btree ("student_id" uuid_ops);
*/