import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Unified System State for absolute compatibility and persistence of all complex structures
export const systemState = pgTable('system_state', {
  id: serial('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relational User table for standard Firebase Auth mapping
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  role: text('role').default('student'),
  createdAt: timestamp('created_at').defaultNow(),
});
