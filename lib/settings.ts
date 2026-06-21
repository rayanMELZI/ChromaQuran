/* Per-user preferences (server-only). One row per user in `user_settings`: the saved
 * Studio defaults (reciter / font / color) + UI language. Replaces the old per-browser
 * localStorage so a user's defaults follow them across devices and the shared account. */
import { getPool, ensureSchema } from "./db";

export interface UserSettings {
  reciter: string | null;
  font: string | null;
  color: string | null;
  lang: string | null;
}

export async function getSettings(userId: string): Promise<UserSettings | null> {
  await ensureSchema();
  const res = await getPool().query(
    `SELECT reciter, font, color, lang FROM user_settings WHERE user_id = $1`,
    [userId]
  );
  const r = res.rows[0];
  if (!r) return null;
  return { reciter: r.reciter, font: r.font, color: r.color, lang: r.lang };
}

/** Upsert a partial settings patch; unspecified fields keep their stored value. */
export async function saveSettings(
  userId: string,
  patch: Partial<UserSettings>
): Promise<UserSettings> {
  await ensureSchema();
  const reciter = patch.reciter ?? null;
  const font = patch.font ?? null;
  const color = patch.color ?? null;
  const lang = patch.lang ?? null;
  const res = await getPool().query(
    `INSERT INTO user_settings (user_id, reciter, font, color, lang)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       reciter = COALESCE(EXCLUDED.reciter, user_settings.reciter),
       font    = COALESCE(EXCLUDED.font,    user_settings.font),
       color   = COALESCE(EXCLUDED.color,   user_settings.color),
       lang    = COALESCE(EXCLUDED.lang,    user_settings.lang),
       updated_at = now()
     RETURNING reciter, font, color, lang`,
    [userId, reciter, font, color, lang]
  );
  const r = res.rows[0];
  return { reciter: r.reciter, font: r.font, color: r.color, lang: r.lang };
}
