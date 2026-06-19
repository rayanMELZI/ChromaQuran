import { NextResponse, type NextRequest } from "next/server";
import { signSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { verifyUser } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email || "");
  const password = String(body.password || "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  let user;
  try {
    user = await verifyUser(email, password);
  } catch {
    return NextResponse.json({ error: "Server error — is the database running?" }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await signSession({ sub: user.id, name: user.name, email: user.email, role: user.role });
  const res = NextResponse.json({ ok: true, user: { name: user.name, email: user.email } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
