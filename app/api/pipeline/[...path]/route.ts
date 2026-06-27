/* Runtime proxy: forwards /api/pipeline/* → Auto Quran's Flask API (/api/*).
 * Done at REQUEST time (not a next.config rewrite) so AUTOQURAN_API_URL is read from the
 * live environment — inside the Docker image that's host.docker.internal:5000, set in .env.
 * The Pipeline tab drives Auto Quran's pipeline through this; it's gated by middleware (auth).
 * Reuses the same AUTOQURAN_API_URL as the "Share on Instagram" feature (lib/share/instagram.ts). */
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function backendBase(): string {
  return (process.env.AUTOQURAN_API_URL || "http://localhost:5000").replace(/\/+$/, "");
}

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const target = `${backendBase()}/api/${path.join("/")}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType; // keep JSON vs multipart boundary

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const init: RequestInit = {
    method: req.method,
    headers,
    body: hasBody ? Buffer.from(await req.arrayBuffer()) : undefined,
  };

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch (e) {
    return NextResponse.json(
      { success: false, message: `Auto Quran is unreachable: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  // Stream the response straight through (previews can be large videos), keeping the type.
  const out = new Headers();
  for (const h of ["content-type", "content-disposition", "cache-control"]) {
    const v = res.headers.get(h);
    if (v) out.set(h, v);
  }
  return new Response(res.body, { status: res.status, headers: out });
}

type Ctx = { params: Promise<{ path: string[] }> };
async function handle(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
