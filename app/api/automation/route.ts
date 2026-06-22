import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { getAutomation, saveAutomation, type AutomationPatch } from "@/lib/automation/store";
import { computeBatch, quranPosition, TOTAL_AYAHS } from "@/lib/automation/batch";
import { surah as getSurah } from "@/lib/quran-data";

export const runtime = "nodejs";

async function userId(req: NextRequest): Promise<string | null> {
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  return s?.sub || null;
}

function withPreview(a: Awaited<ReturnType<typeof getAutomation>>) {
  const { batch } = computeBatch(a.cursorSurah, a.cursorAyah, a.ayahsPerDay);
  const s = getSurah(batch.surah);
  return {
    ...a,
    progress: { done: quranPosition(a.cursorSurah, a.cursorAyah) - 1, total: TOTAL_AYAHS },
    nextUp: { surah: batch.surah, surahAr: s.ar, surahTr: s.tr, from: batch.from, to: batch.to },
  };
}

export async function GET(req: NextRequest) {
  const uid = await userId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ automation: withPreview(await getAutomation(uid)) });
  } catch {
    return NextResponse.json({ error: "Server error — is the database running?" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const uid = await userId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: AutomationPatch = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.frameTag === "boolean") patch.frameTag = body.frameTag;
  if (typeof body.reciter === "string") patch.reciter = body.reciter;
  if (typeof body.font === "string") patch.font = body.font;
  if (typeof body.color === "string") patch.color = body.color;
  if (Number.isInteger(body.runHour) && (body.runHour as number) >= 0 && (body.runHour as number) <= 23)
    patch.runHour = body.runHour as number;
  if (Number.isInteger(body.runMinute) && (body.runMinute as number) >= 0 && (body.runMinute as number) <= 59)
    patch.runMinute = body.runMinute as number;
  if (Number.isInteger(body.ayahsPerDay) && (body.ayahsPerDay as number) >= 1 && (body.ayahsPerDay as number) <= 10)
    patch.ayahsPerDay = body.ayahsPerDay as number;
  // Optional manual reset of where in the Quran we are.
  if (Number.isInteger(body.cursorSurah) && (body.cursorSurah as number) >= 1 && (body.cursorSurah as number) <= 114)
    patch.cursorSurah = body.cursorSurah as number;
  if (Number.isInteger(body.cursorAyah) && (body.cursorAyah as number) >= 1) patch.cursorAyah = body.cursorAyah as number;

  try {
    return NextResponse.json({ automation: withPreview(await saveAutomation(uid, patch)) });
  } catch {
    return NextResponse.json({ error: "Server error — is the database running?" }, { status: 500 });
  }
}
