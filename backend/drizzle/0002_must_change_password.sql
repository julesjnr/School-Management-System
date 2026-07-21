ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "lecturers" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT true NOT NULL;
