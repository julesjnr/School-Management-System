import dotenv from 'dotenv';
dotenv.config({ override: true });
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.ts';

// Function to create a new connection pool.
export const createPool = () => {
  return new Pool({
    host: process.env.SQL_HOST,
    port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : undefined,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false },
    max: 10,
    min: 0,
    idleTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 2000,
  });
};

// Create a pool instance.
const pool = createPool();

// Prevent unhandled pool-level errors from crashing the app or spamming logs on remote socket timeouts
pool.on('error', (err: any) => {
  const code = err?.code || err?.errno;
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === '57P01' || code === '57P02' || code === -110) {
    console.log(`[SQL Pool] Idle connection closed by remote pooler (${code || 'ETIMEDOUT'}); pool will automatically reconnect on next query.`);
  } else {
    console.error('Unexpected error on idle SQL pool client:', err?.message || err);
  }
});

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
