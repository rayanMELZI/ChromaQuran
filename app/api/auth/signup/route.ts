import { NextResponse, type NextRequest } from "next/server";
import { signSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { createUser, DuplicateEmailError } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email || "").trim();
  const name = String(body.name || "").trim();
  const password = String(body.password || "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json({ error: "Enter your name" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  let user;
  try {
    user = await createUser(email, name, password);
  } catch (e) {
    if (e instanceof DuplicateEmailError) {
      return NextResponse.json({ error: "That email is already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error — is the database running?" }, { status: 500 });
  }

  const token = await signSession({ sub: user.id, name: user.name, email: user.email, role: user.role });
  const res = NextResponse.json({ ok: true, user: { name: user.name, email: user.email } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
