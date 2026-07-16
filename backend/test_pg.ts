import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';

async function testConnection() {
  try {
    console.log("Connecting to PostgreSQL...");
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Connection successful! Public tables:");
    console.log(tables.rows.map((r: any) => r.table_name));

    console.log("Checking if student_ledger table exists...");
    const checkTable = tables.rows.some((r: any) => r.table_name === 'student_ledger');
    
    if (!checkTable) {
      console.log("Creating student_ledger table...");
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS student_ledger (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
          vote_head VARCHAR(100) NOT NULL,
          amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
          description TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        )
      `);
      console.log("student_ledger table created successfully!");
    } else {
      console.log("student_ledger table already exists.");
    }
    
    process.exit(0);
  } catch (err: any) {
    console.error("Database connection or schema creation failed:", err.message);
    process.exit(1);
  }
}

testConnection();
