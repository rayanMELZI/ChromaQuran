/* Manually run the next batch now (the "Run now" button) — renders + posts immediately,
 * independent of the daily schedule. Useful for testing and for catching up by hand. */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { getAutomation } from "@/lib/automation/store";
import { runJobForUser } from "@/lib/automation/runner";

export const runtime = "nodejs";
export const maxDuration = 300; // a render + upload can take a couple of minutes

export async function POST(req: NextRequest) {
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const cfg = await getAutomation(s.sub);
    const result = await runJobForUser(s.sub, cfg);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
