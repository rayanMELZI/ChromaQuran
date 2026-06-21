import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { getSettings, saveSettings, type UserSettings } from "@/lib/settings";

export const runtime = "nodejs";

async function userId(req: NextRequest): Promise<string | null> {
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  return s?.sub || null;
}

export async function GET(req: NextRequest) {
  const uid = await userId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ settings: (await getSettings(uid)) || {} });
  } catch {
    return NextResponse.json({ error: "Server error — is the database running?" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const uid = await userId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<UserSettings>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only accept the known fields; ignore anything else a caller sends.
  const patch: Partial<UserSettings> = {};
  if (typeof body.reciter === "string") patch.reciter = body.reciter;
  if (typeof body.font === "string") patch.font = body.font;
  if (typeof body.color === "string") patch.color = body.color;
  if (body.lang === "en" || body.lang === "ar") patch.lang = body.lang;

  try {
    return NextResponse.json({ settings: await saveSettings(uid, patch) });
  } catch {
    return NextResponse.json({ error: "Server error — is the database running?" }, { status: 500 });
  }
}
