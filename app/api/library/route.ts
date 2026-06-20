import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { listVideos, addVideo, type NewVideo } from "@/lib/videos";

export const runtime = "nodejs";

async function userId(req: NextRequest): Promise<string | null> {
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  return s?.sub || null;
}

export async function GET(req: NextRequest) {
  const uid = await userId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ videos: await listVideos(uid) });
  } catch {
    return NextResponse.json({ error: "Server error — is the database running?" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const uid = await userId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<NewVideo>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const surah = Number(body.surah);
  const from = Number(body.from);
  const to = Number(body.to);
  if (!Number.isInteger(surah) || !Number.isInteger(from) || !Number.isInteger(to)) {
    return NextResponse.json({ error: "surah/from/to are required" }, { status: 400 });
  }

  const video: NewVideo = {
    surah,
    from,
    to,
    reciter: String(body.reciter || ""),
    font: String(body.font || ""),
    color: String(body.color || ""),
    dur: Number(body.dur) || 0,
    snippet: String(body.snippet || ""),
    name: String(body.name || "chromaquran.mp4"),
    url: body.url ? String(body.url) : undefined,
  };

  try {
    return NextResponse.json({ video: await addVideo(uid, video) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error — is the database running?" }, { status: 500 });
  }
}
