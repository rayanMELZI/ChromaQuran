/* Per-user auto-post schedule (server-only). Backed by the `automation` table. */
import { getPool, ensureSchema } from "@/lib/db";

export interface Automation {
  enabled: boolean;
  runHour: number;
  runMinute: number;
  reciter: string;
  ayahsPerDay: number;
  frameTag: boolean;
  font: string;
  color: string;
  cursorSurah: number;
  cursorAyah: number;
  lastRunDate: string | null; // YYYY-MM-DD (local) of the last run we claimed
  lastStatus: string | null; // 'ok' | 'error' | null
  lastMessage: string | null;
  postsCount: number;
}

export const DEFAULT_AUTOMATION: Automation = {
  enabled: false,
  runHour: 10,
  runMinute: 0,
  reciter: "alafasy",
  ayahsPerDay: 7,
  frameTag: true,
  font: "amiri",
  color: "warm",
  cursorSurah: 1,
  cursorAyah: 1,
  lastRunDate: null,
  lastStatus: null,
  lastMessage: null,
  postsCount: 0,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToAutomation(r: any): Automation {
  return {
    enabled: r.enabled,
    runHour: r.run_hour,
    runMinute: r.run_minute,
    reciter: r.reciter,
    ayahsPerDay: r.ayahs_per_day,
    frameTag: r.frame_tag,
    font: r.font,
    color: r.color,
    cursorSurah: r.cursor_surah,
    cursorAyah: r.cursor_ayah,
    lastRunDate: r.last_run_date ? localDateString(new Date(r.last_run_date)) : null,
    lastStatus: r.last_status,
    lastMessage: r.last_message,
    postsCount: r.posts_count,
  };
}

/** Local YYYY-MM-DD (the server's local day — what "10 AM" is measured against). */
export function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const SELECT = `enabled, run_hour, run_minute, reciter, ayahs_per_day, frame_tag, font, color,
  cursor_surah, cursor_ayah, last_run_date, last_status, last_message, posts_count`;

export async function getAutomation(userId: string): Promise<Automation> {
  await ensureSchema();
  const res = await getPool().query(`SELECT ${SELECT} FROM automation WHERE user_id = $1`, [userId]);
  return res.rows[0] ? rowToAutomation(res.rows[0]) : { ...DEFAULT_AUTOMATION };
}

export interface AutomationPatch {
  enabled?: boolean;
  runHour?: number;
  runMinute?: number;
  reciter?: string;
  ayahsPerDay?: number;
  frameTag?: boolean;
  font?: string;
  color?: string;
  cursorSurah?: number;
  cursorAyah?: number;
}

/** Save a config patch; unspecified columns keep their stored value (COALESCE).
 * Ensures a default row exists first so a brand-new user's NOT NULL columns get
 * the table defaults rather than the NULLs of a partial patch. */
export async function saveAutomation(userId: string, patch: AutomationPatch): Promise<Automation> {
  await ensureSchema();
  const pool = getPool();
  await pool.query(
    `INSERT INTO automation (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
  const res = await pool.query(
    `UPDATE automation SET
       enabled       = COALESCE($2, enabled),
       run_hour      = COALESCE($3, run_hour),
       run_minute    = COALESCE($4, run_minute),
       reciter       = COALESCE($5, reciter),
       ayahs_per_day = COALESCE($6, ayahs_per_day),
       frame_tag     = COALESCE($7, frame_tag),
       font          = COALESCE($8, font),
       color         = COALESCE($9, color),
       cursor_surah  = COALESCE($10, cursor_surah),
       cursor_ayah   = COALESCE($11, cursor_ayah),
       updated_at    = now()
     WHERE user_id = $1
     RETURNING ${SELECT}`,
    [
      userId,
      patch.enabled ?? null,
      patch.runHour ?? null,
      patch.runMinute ?? null,
      patch.reciter ?? null,
      patch.ayahsPerDay ?? null,
      patch.frameTag ?? null,
      patch.font ?? null,
      patch.color ?? null,
      patch.cursorSurah ?? null,
      patch.cursorAyah ?? null,
    ]
  );
  return rowToAutomation(res.rows[0]);
}

/** Atomically claim today's run: sets last_run_date=today only if it isn't already today.
 * Returns the claimed row, or null if another tick already claimed it (prevents double-posting). */
export async function claimRun(userId: string, today: string): Promise<Automation | null> {
  await ensureSchema();
  const res = await getPool().query(
    `UPDATE automation SET last_run_date = $2::date, updated_at = now()
     WHERE user_id = $1 AND (last_run_date IS NULL OR last_run_date < $2::date)
     RETURNING ${SELECT}`,
    [userId, today]
  );
  return res.rows[0] ? rowToAutomation(res.rows[0]) : null;
}

/** Record the outcome of a run; on success advance the cursor and bump the count. */
export async function finishRun(
  userId: string,
  ok: boolean,
  message: string,
  nextSurah?: number,
  nextAyah?: number
): Promise<void> {
  await ensureSchema();
  if (ok && nextSurah && nextAyah) {
    await getPool().query(
      `UPDATE automation SET last_status='ok', last_message=$2, cursor_surah=$3, cursor_ayah=$4,
         posts_count = posts_count + 1, updated_at = now() WHERE user_id=$1`,
      [userId, message.slice(0, 500), nextSurah, nextAyah]
    );
  } else {
    await getPool().query(
      `UPDATE automation SET last_status='error', last_message=$2, updated_at=now() WHERE user_id=$1`,
      [userId, message.slice(0, 500)]
    );
  }
}

/** All users with automation enabled (for the scheduler tick). */
export async function listEnabled(): Promise<Array<{ userId: string } & Automation>> {
  await ensureSchema();
  const res = await getPool().query(
    `SELECT user_id, ${SELECT} FROM automation WHERE enabled = true`
  );
  return res.rows.map((r: any) => ({ userId: String(r.user_id), ...rowToAutomation(r) }));
}
