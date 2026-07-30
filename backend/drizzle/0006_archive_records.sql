CREATE TABLE IF NOT EXISTS "archive_records" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "resource_type" varchar(30) NOT NULL,
  "resource_id" text NOT NULL,
  "display_name" varchar(255) NOT NULL,
  "snapshot" jsonb NOT NULL,
  "archived_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_by" varchar(255),
  CONSTRAINT "archive_records_resource_key" UNIQUE("resource_type", "resource_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_archive_records_archived_at" ON "archive_records" USING btree ("archived_at" DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "archive_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "resource_type" varchar(30) NOT NULL,
  "resource_id" text NOT NULL,
  "action" varchar(30) NOT NULL,
  "performed_by" varchar(255),
  "performed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "details" jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_archive_audit_resource" ON "archive_audit_logs" USING btree ("resource_type", "resource_id");
