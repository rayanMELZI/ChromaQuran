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

/** Idempotently create the tables we need. Runs once per process.
 * `videos` references `users`, so it must be created after it. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const pool = getPool();
    schemaReady = pool
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
      .then(() =>
        pool.query(
          // `from`/`to` are SQL reserved words → store as from_ayah/to_ayah.
          `CREATE TABLE IF NOT EXISTS videos (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            surah INT NOT NULL,
            from_ayah INT NOT NULL,
            to_ayah INT NOT NULL,
            reciter TEXT NOT NULL,
            font TEXT NOT NULL,
            color TEXT NOT NULL,
            dur INT NOT NULL,
            snippet TEXT NOT NULL DEFAULT '',
            name TEXT NOT NULL,
            url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )`
        )
      )
      .then(() =>
        pool.query(
          `CREATE INDEX IF NOT EXISTS videos_user_created_idx
             ON videos (user_id, created_at DESC)`
        )
      )
      .then(() =>
        pool.query(
          // One row per user: their saved Studio defaults + UI language.
          `CREATE TABLE IF NOT EXISTS user_settings (
            user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            reciter TEXT,
            font TEXT,
            color TEXT,
            lang TEXT,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )`
        )
      )
      .then(() =>
        pool.query(
          // One row per user: a daily auto-post schedule that walks the whole Quran.
          // cursor_surah/cursor_ayah = the next ayah to post; last_run_date guards one
          // run per local day (also used to claim a run so the minute-ticker can't double-fire).
          `CREATE TABLE IF NOT EXISTS automation (
            user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            enabled BOOLEAN NOT NULL DEFAULT false,
            run_hour INT NOT NULL DEFAULT 10,
            run_minute INT NOT NULL DEFAULT 0,
            reciter TEXT NOT NULL DEFAULT 'alafasy',
            ayahs_per_day INT NOT NULL DEFAULT 7,
            frame_tag BOOLEAN NOT NULL DEFAULT true,
            font TEXT NOT NULL DEFAULT 'amiri',
            color TEXT NOT NULL DEFAULT 'warm',
            cursor_surah INT NOT NULL DEFAULT 1,
            cursor_ayah INT NOT NULL DEFAULT 1,
            last_run_date DATE,
            last_status TEXT,
            last_message TEXT,
            posts_count INT NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )`
        )
      )
      .then(() => undefined)
      .catch((e) => {
        schemaReady = null; // allow retry on next call
        throw e;
      });
  }
  return schemaReady;
}
