import { NextResponse, type NextRequest } from "next/server";
import { createJob } from "@/lib/render/jobs";
import type { RenderParams } from "@/lib/render/worker";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Partial<RenderParams>;
  try {
    body = (await req.json()) as Partial<RenderParams>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const surah = Number(body.surah);
  const from = Number(body.from);
  const to = Number(body.to);
  if (!surah || !from || !to || from > to || surah < 1 || surah > 114) {
    return NextResponse.json({ error: "Invalid passage params" }, { status: 400 });
  }

  const params: RenderParams = {
    surah,
    from,
    to,
    reciter: String(body.reciter || "alafasy"),
    font: String(body.font || "amiri"),
    color: String(body.color || "warm"),
    size: Number(body.size) || 8.4,
    trans: !!body.trans,
    mark: body.mark !== false,
    head: body.head !== false,
  };

  const job = createJob(params, req.nextUrl.origin);
  return NextResponse.json({ id: job.id });
}
