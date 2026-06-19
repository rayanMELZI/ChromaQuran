/* Multi-user auth for ChromaQuran.
 * Accounts live in Postgres (see lib/users.ts). On login/signup we issue an HS256 JWT in a
 * HOST-ONLY httpOnly cookie — never a .rayanemelzi.dev cookie, which would leak the session to
 * every other project on the domain. Auto Quran shares ACCOUNTS by connecting to the same DB,
 * not by sharing this cookie.
 *
 * No `next/headers` import here, so this module is safe to use from Edge middleware.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "wfq_session";
export const DEFAULT_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const ALG = "HS256";

function secretKey(): Uint8Array {
  const s = process.env.AUTH_JWT_SECRET;
  if (!s) throw new Error("AUTH_JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export interface SessionClaims {
  sub: string; // user id
  name: string; // display name
  email: string;
  role: string; // e.g. "user"
}

export async function signSession(claims: SessionClaims, maxAgeSec = DEFAULT_MAX_AGE): Promise<string> {
  return new SignJWT({ name: claims.name, email: claims.email, role: claims.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALG] });
    return {
      sub: String(payload.sub || ""),
      name: String(payload.name || ""),
      email: String(payload.email || ""),
      role: String(payload.role || ""),
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSec = DEFAULT_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  };
}
