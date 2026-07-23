import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Verify connection parameters or fallback to connection string
const connectionUrl = process.env.DATABASE_URL;
const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_USER;
const password = process.env.SQL_PASSWORD;
const port = Number(process.env.SQL_PORT) || 5432;

if (!connectionUrl && (!sqlHost || !sqlDbName || !user || !password)) {
  throw new Error(
    "Missing database credentials! Provide either DATABASE_URL or individual SQL_* environment variables in your .env file."
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["public"],
  dbCredentials: connectionUrl
    ? {
        url: connectionUrl,
      }
    : {
        host: sqlHost!,
        port,
        user: user!,
        password: password!,
        database: sqlDbName!,
        ssl: "require",
      },
  verbose: true,
});