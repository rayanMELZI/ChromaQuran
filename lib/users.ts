/* User accounts (server-only). bcrypt hashes are cross-language, so Auto Quran (Flask)
 * can verify the same `users` table with passlib/bcrypt. */
import bcrypt from "bcryptjs";
import { getPool, ensureSchema } from "./db";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("Email already registered");
    this.name = "DuplicateEmailError";
  }
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function createUser(email: string, name: string, password: string): Promise<User> {
  await ensureSchema();
  const hash = await bcrypt.hash(password, 10);
  try {
    const res = await getPool().query(
      `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
       RETURNING id, email, name, role`,
      [normalizeEmail(email), name.trim(), hash]
    );
    const r = res.rows[0];
    return { id: String(r.id), email: r.email, name: r.name, role: r.role };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23505") {
      throw new DuplicateEmailError();
    }
    throw e;
  }
}

export async function verifyUser(email: string, password: string): Promise<User | null> {
  await ensureSchema();
  const res = await getPool().query(
    `SELECT id, email, name, role, password_hash FROM users WHERE email = $1`,
    [normalizeEmail(email)]
  );
  const r = res.rows[0];
  if (!r) return null;
  const ok = await bcrypt.compare(password, r.password_hash);
  if (!ok) return null;
  return { id: String(r.id), email: r.email, name: r.name, role: r.role };
}
