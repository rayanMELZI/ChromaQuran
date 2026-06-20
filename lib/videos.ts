/* Per-user video library (server-only). Rows live in Postgres `videos`, scoped by user id.
 * Mirrors the client `Video` shape in contexts/StudioContext.tsx. */
import { getPool, ensureSchema } from "./db";

export interface VideoRow {
  id: string;
  surah: number;
  from: number;
  to: number;
  reciter: string;
  font: string;
  color: string;
  dur: number;
  date: number; // ms epoch, from created_at
  snippet: string;
  name: string;
  url?: string;
}

/** Fields a caller supplies when saving a video (id/date are assigned by the DB). */
export type NewVideo = Omit<VideoRow, "id" | "date">;

function rowToVideo(r: {
  id: string | number;
  surah: number;
  from_ayah: number;
  to_ayah: number;
  reciter: string;
  font: string;
  color: string;
  dur: number;
  snippet: string;
  name: string;
  url: string | null;
  created_at: Date;
}): VideoRow {
  return {
    id: String(r.id),
    surah: r.surah,
    from: r.from_ayah,
    to: r.to_ayah,
    reciter: r.reciter,
    font: r.font,
    color: r.color,
    dur: r.dur,
    date: new Date(r.created_at).getTime(),
    snippet: r.snippet,
    name: r.name,
    url: r.url ?? undefined,
  };
}

export async function listVideos(userId: string): Promise<VideoRow[]> {
  await ensureSchema();
  const res = await getPool().query(
    `SELECT id, surah, from_ayah, to_ayah, reciter, font, color, dur, snippet, name, url, created_at
       FROM videos WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows.map(rowToVideo);
}

export async function addVideo(userId: string, v: NewVideo): Promise<VideoRow> {
  await ensureSchema();
  const res = await getPool().query(
    `INSERT INTO videos
       (user_id, surah, from_ayah, to_ayah, reciter, font, color, dur, snippet, name, url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, surah, from_ayah, to_ayah, reciter, font, color, dur, snippet, name, url, created_at`,
    [
      userId,
      v.surah,
      v.from,
      v.to,
      v.reciter,
      v.font,
      v.color,
      v.dur,
      v.snippet,
      v.name,
      v.url ?? null,
    ]
  );
  return rowToVideo(res.rows[0]);
}

/** Deletes a video the user owns; returns true if a row was removed. */
export async function deleteVideo(userId: string, id: string): Promise<boolean> {
  await ensureSchema();
  const res = await getPool().query(
    `DELETE FROM videos WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return (res.rowCount ?? 0) > 0;
}
