/* Executes one automation batch: render the next ayahs -> post to Instagram (via the
 * Auto Quran API) -> save to the user's library -> advance the cursor. Reuses the exact
 * same render queue and share path as the manual Studio flow. Server-only. */
import path from "node:path";
import { createJob, getJob } from "@/lib/render/jobs";
import { RENDERS_DIR, type RenderParams } from "@/lib/render/worker";
import { shareToInstagram } from "@/lib/share/instagram";
import { addVideo } from "@/lib/videos";
import { surah as getSurah, reciterObj } from "@/lib/quran-data";
import { computeBatch } from "./batch";
import {
  getAutomation,
  claimRun,
  finishRun,
  listEnabled,
  localDateString,
  type Automation,
} from "./store";

// The headless render browser loads /render from the running server itself.
const SELF_ORIGIN = process.env.CQ_SELF_ORIGIN || `http://127.0.0.1:${process.env.PORT || 3000}`;
const RENDER_TIMEOUT_MS = 6 * 60 * 1000;

const inFlight = new Set<string>(); // userIds currently running (per-process guard)

export interface RunResult {
  ok: boolean;
  message: string;
  surah?: number;
  from?: number;
  to?: number;
}

function captionFor(surahNum: number, from: number, to: number, reciter: string): string {
  const s = getSurah(surahNum);
  const r = reciterObj(reciter);
  const range = from === to ? `${from}` : `${from}-${to}`;
  return `${s.ar} (${s.tr}) ${range}\n${r.en}\n\n#Quran #القرآن #تلاوة`;
}

async function waitForRender(jobId: string): Promise<{ ok: boolean; name?: string; url?: string; error?: string }> {
  const deadline = Date.now() + RENDER_TIMEOUT_MS;
  for (;;) {
    const job = getJob(jobId);
    if (!job) return { ok: false, error: "render job vanished" };
    if (job.status === "done") return { ok: true, name: job.name, url: job.url };
    if (job.status === "error") return { ok: false, error: job.error || "render failed" };
    if (Date.now() > deadline) return { ok: false, error: "render timed out" };
    await new Promise((res) => setTimeout(res, 1000));
  }
}

/** Render + post the batch the cursor currently points at. Does NOT claim/advance by
 * itself when called directly (used by "Run now"); pass the config explicitly. */
export async function runJobForUser(userId: string, cfg: Automation): Promise<RunResult> {
  if (inFlight.has(userId)) return { ok: false, message: "A run is already in progress" };
  inFlight.add(userId);
  try {
    const { batch, nextSurah, nextAyah } = computeBatch(cfg.cursorSurah, cfg.cursorAyah, cfg.ayahsPerDay);

    const params: RenderParams = {
      surah: batch.surah,
      from: batch.from,
      to: batch.to,
      reciter: cfg.reciter,
      font: cfg.font,
      color: cfg.color,
      size: 8.4,
      trans: false,
      mark: true,
      head: true,
      frameTag: cfg.frameTag,
    };

    const job = createJob(params, SELF_ORIGIN);
    const r = await waitForRender(job.id);
    if (!r.ok) {
      await finishRun(userId, false, `Render failed: ${r.error}`);
      return { ok: false, message: `Render failed: ${r.error}` };
    }

    const file = path.join(RENDERS_DIR, `${job.id}.mp4`);
    const caption = captionFor(batch.surah, batch.from, batch.to, cfg.reciter);
    const share = await shareToInstagram(file, caption);
    if (!share.ok) {
      await finishRun(userId, false, `Posted render but Instagram failed: ${share.output}`);
      return { ok: false, message: `Instagram failed: ${share.output}` };
    }

    // Save to the user's library, then advance the cursor.
    try {
      await addVideo(userId, {
        surah: batch.surah,
        from: batch.from,
        to: batch.to,
        reciter: cfg.reciter,
        font: cfg.font,
        color: cfg.color,
        dur: 0,
        snippet: "",
        name: r.name || "chromaquran.mp4",
        url: r.url,
      });
    } catch {
      /* library save is best-effort — the post already succeeded */
    }

    const s = getSurah(batch.surah);
    const msg = `Posted ${s.tr} ${batch.from}-${batch.to} to Instagram`;
    await finishRun(userId, true, msg, nextSurah, nextAyah);
    return { ok: true, message: msg, surah: batch.surah, from: batch.from, to: batch.to };
  } finally {
    inFlight.delete(userId);
  }
}

/** Scheduler tick: run any enabled schedule whose time has arrived and that hasn't run today. */
export async function runDueAutomations(): Promise<void> {
  let due: Awaited<ReturnType<typeof listEnabled>>;
  try {
    due = await listEnabled();
  } catch {
    return; // DB not reachable yet — try again next tick
  }

  const now = new Date();
  const today = localDateString(now);
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  for (const a of due) {
    const scheduled = a.runHour * 60 + a.runMinute;
    if (minutesNow < scheduled) continue; // not time yet today
    if (a.lastRunDate === today) continue; // already ran (or claimed) today

    // Claim the day atomically so a slow render can't be double-started by the next tick.
    const claimed = await claimRun(a.userId, today);
    if (!claimed) continue; // someone else claimed it

    try {
      await runJobForUser(a.userId, claimed);
    } catch (e) {
      await finishRun(a.userId, false, e instanceof Error ? e.message : String(e));
    }
  }
}
