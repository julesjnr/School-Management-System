import dotenv from 'dotenv';
dotenv.config({ override: true });
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.ts';

// Function to create a new connection pool.
export const createPool = () => {
  const connectionString = process.env.DATABASE_URL;
  const hasSqlConfig = Boolean(
    process.env.SQL_HOST &&
    process.env.SQL_USER &&
    process.env.SQL_PASSWORD &&
    process.env.SQL_DB_NAME
  );

  // Supabase session poolers enforce comparatively small connection limits.  A
  // small application pool prevents concurrent startup reads/syncs from
  // exhausting those sessions and makes every connection reusable.
  const max = Number(process.env.DB_POOL_MAX) || 3;
  const connectionTimeoutMillis = Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 30000;
  const idleTimeoutMillis = Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000;
  const maxLifetimeSeconds = Number(process.env.DB_MAX_LIFETIME_SECONDS) || 300;

  if (hasSqlConfig) {
    return new Pool({
      host: process.env.SQL_HOST,
      port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      connectionTimeoutMillis,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      max,
      min: 0,
      idleTimeoutMillis,
      maxLifetimeSeconds,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
    });
  }

  if (connectionString) {
    return new Pool({
      connectionString,
      connectionTimeoutMillis,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      max,
      min: 0,
      idleTimeoutMillis,
      maxLifetimeSeconds,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
    });
  }

  throw new Error('Missing database configuration: provide SQL_HOST/SQL_USER/SQL_PASSWORD/SQL_DB_NAME or DATABASE_URL.');
};

// Create a singleton pool instance.
export const pool = createPool();

// Prevent unhandled pool-level errors from crashing the app or spamming logs on remote socket timeouts
pool.on('error', (err: any) => {
  const code = err?.code || err?.errno;
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'EPIPE' || code === '57P01' || code === '57P02' || code === -110) {
    console.log(`[SQL Pool] Idle connection closed by remote pooler (${code || 'ETIMEDOUT'}); pool will automatically reconnect on next query.`);
  } else {
    console.error('Unexpected error on idle SQL pool client:', err?.message || err);
  }
});

// Drain and close database pool gracefully during HMR / process termination
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('[SQL Pool] Connection pool closed successfully.');
  } catch (err) {
    console.error('[SQL Pool] Error closing pool:', err);
  }
}

// Initialize Drizzle with the pool, schema, and disable prepared statements for PgBouncer compatibility.
export const db = drizzle(pool, { schema, prepare: false } as any);
