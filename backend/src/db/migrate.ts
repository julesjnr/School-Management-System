import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";
import { db } from "./index.ts";

// This module is imported by the CommonJS production bundle as well as run by
// tsx in development. Resolve from the workspace rather than import.meta.url.
const workspaceDrizzleDir = path.resolve(process.cwd(), "backend/drizzle");
const drizzleDir = fs.existsSync(workspaceDrizzleDir)
  ? workspaceDrizzleDir
  : path.resolve(process.cwd(), "drizzle");
const studentSchemaMigrations = [
  "0004_student_registry_fields.sql",
  "0005_student_account_status.sql",
  "0006_archive_records.sql",
  "0007_attendance_late_students.sql",
  "0008_allow_negative_invoice_amounts.sql",
  "0009_admissions_academics_production.sql",
];

export async function runMigrations(retries = 3, delayMs = 2000): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS app_migrations (
          name VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        )
      `);

      const appliedRows = await db.execute(sql`SELECT name FROM app_migrations`);
      const applied = new Set(
        appliedRows.rows
          .map((row: any) => row?.name)
          .filter((name: unknown): name is string => typeof name === "string"),
      );

      for (const migrationFile of studentSchemaMigrations) {
        if (applied.has(migrationFile)) {
          continue;
        }

        const migrationPath = path.join(drizzleDir, migrationFile);
        const migrationSql = fs.readFileSync(migrationPath, "utf8");
        const statements = migrationSql
          .split("--> statement-breakpoint")
          .map((statement) => statement.trim())
          .filter(Boolean);

        for (const statement of statements) {
          await db.execute(sql.raw(statement));
        }

        await db.execute(
          sql`INSERT INTO app_migrations (name) VALUES (${migrationFile}) ON CONFLICT (name) DO NOTHING`,
        );
      }
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `[Migrations] Attempt ${attempt}/${retries} failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      if (attempt < retries) {
        console.log(`[Migrations] Retrying in ${delayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

if (process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")) {
  runMigrations()
    .then(() => {
      console.log("Drizzle migrations completed successfully.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Drizzle migrations failed:", error);
      process.exit(1);
    });
}
