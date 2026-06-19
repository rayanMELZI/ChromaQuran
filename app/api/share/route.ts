import { NextResponse, type NextRequest } from "next/server";
import { stat } from "node:fs/promises";
import path from "node:path";
import { shareToInstagram } from "@/lib/share/instagram";

export const runtime = "nodejs";

// matches RENDERS_DIR in lib/render/worker.ts (kept local to avoid importing the heavy worker)
const RENDERS_DIR = path.join(process.cwd(), "renders");

export async function POST(req: NextRequest) {
  let body: { jobId?: string; caption?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const jobId = String(body.jobId || "");
  const caption = String(body.caption || "").slice(0, 2200);
  if (!/^job_[a-z0-9]+$/i.test(jobId)) {
    return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  }

  const file = path.join(RENDERS_DIR, `${jobId}.mp4`);
  try {
    await stat(file);
  } catch {
    return NextResponse.json(
      { error: "Rendered video not found — re-render before sharing" },
      { status: 404 }
    );
  }

  const result = await shareToInstagram(file, caption);
  if (!result.ok) {
    return NextResponse.json({ error: result.output || "Share failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
