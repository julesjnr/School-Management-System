ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "programme" varchar(255);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "department" varchar(255);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "account_status" varchar(50) DEFAULT 'Active' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN IF EXISTS "passcode";
