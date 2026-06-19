/* Postgres connection + schema (server-only). Shared with Auto Quran via DATABASE_URL. */
import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    pool = new Pool({ connectionString, max: 5 });
  }
  return pool;
}

let schemaReady: Promise<void> | null = null;

/** Idempotently create the tables we need. Runs once per process. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`
      )
      .then(() => undefined)
      .catch((e) => {
        schemaReady = null; // allow retry on next call
        throw e;
      });
  }
  return schemaReady;
}
