CREATE TABLE "lecturer_subjects" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"subject_code" varchar(30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_ledger" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"student_id" uuid NOT NULL,
	"entry_type" varchar(10) NOT NULL,
	"vote_head" varchar(100) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_ledger_entry_type_check" CHECK ((entry_type)::text = ANY ((ARRAY['DEBIT'::character varying, 'CREDIT'::character varying])::text[])),
	CONSTRAINT "student_ledger_amount_check" CHECK (amount >= (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"reference_no" varchar(50) NOT NULL,
	"recipient_sender" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'KES' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_reference_no_key" UNIQUE("reference_no")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'student',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_key" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "book_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "book_reviews" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "books" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "course_reviews" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "courses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "exam_papers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expenses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "grades" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoices" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lecturer_publications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lecturer_research_interests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lecturers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "library_gate_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "loans" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mock_emails" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "office_hour_slots" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "password_reset_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reading_list_books" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reading_lists" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "requisitions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reservations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stock_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student_attendance" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student_enrollments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "students" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "system_state" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "teacher_resources" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "testimonies" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lecturer_subjects" ADD CONSTRAINT "lecturer_subjects_lecturer_id_lecturers_id_fk" FOREIGN KEY ("lecturer_id") REFERENCES "public"."lecturers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_ledger" ADD CONSTRAINT "student_ledger_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;