import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { getJob } from "@/lib/render/jobs";
import { RENDERS_DIR } from "@/lib/render/worker";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job || job.status !== "done") return new Response("Not found", { status: 404 });

  const file = path.join(RENDERS_DIR, `${id}.mp4`);
  try {
    const s = await stat(file);
    const buf = await readFile(file);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(s.size),
        "Content-Disposition": `attachment; filename="${job.name || "chromaquran.mp4"}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
