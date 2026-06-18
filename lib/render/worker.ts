/* ChromaQuran render worker (server-only).
 * Rasterizes the /render composition at 1080×1920 with Playwright (one PNG per ayah),
 * downloads each ayah's recitation, then assembles them with ffmpeg into a real MP4
 * where each verse is shown for the exact length of its audio. Runs on the Node server
 * (works locally and on the nginx box; ffmpeg ships via ffmpeg-static, no system install).
 */
import { chromium, type Browser, type BrowserContext } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { surah as getSurah, type Ayah } from "@/lib/quran-data";
import { ayahAudioUrl } from "@/lib/audio";

const execFileP = promisify(execFile);
const FF = ffmpegPath as unknown as string;

export interface RenderParams {
  surah: number;
  from: number;
  to: number;
  reciter: string;
  font: string;
  color: string;
  size: number;
  trans: boolean;
  mark: boolean;
  head: boolean;
}

export type ProgressFn = (percent: number, stage?: string) => void;

export const RENDERS_DIR = path.join(process.cwd(), "renders");

let browserPromise: Promise<Browser> | null = null;
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true }).catch((e) => {
      browserPromise = null;
      throw e;
    });
  }
  return browserPromise;
}

async function ayahNumbersInRange(surahNum: number, from: number, to: number): Promise<number[]> {
  const file = path.join(process.cwd(), "public", "data", "surahs", `${surahNum}.json`);
  const data = JSON.parse(await fs.readFile(file, "utf8")) as { ayahs: Ayah[] };
  return data.ayahs.filter((a) => a.n >= from && a.n <= to).map((a) => a.n);
}

function fileBaseName(p: RenderParams): string {
  const s = getSurah(p.surah);
  const tr = s ? s.tr.toLowerCase().replace(/[^a-z]/g, "") : "surah";
  return `chromaquran-${tr}-${p.from}-${p.to}.mp4`;
}

export async function renderJob(
  p: RenderParams,
  origin: string,
  jobId: string,
  onProgress: ProgressFn
): Promise<{ url: string; name: string; file: string }> {
  const ayahNums = await ayahNumbersInRange(p.surah, p.from, p.to);
  if (!ayahNums.length) throw new Error("No ayahs in the selected range");
  if (!FF) throw new Error("ffmpeg binary not found");

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cq-render-"));
  const browser = await getBrowser();
  let ctx: BrowserContext | null = null;

  try {
    ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const N = ayahNums.length;
    const q = (k: string, v: string | number) => `${k}=${encodeURIComponent(String(v))}`;
    const frames: string[] = [];
    const audios: string[] = [];

    onProgress(3, "prep");

    // 1) rasterize one frame per ayah
    for (let i = 0; i < N; i++) {
      const an = ayahNums[i];
      const url =
        `${origin}/render?` +
        [
          q("surah", p.surah),
          q("ayah", an),
          q("font", p.font),
          q("color", p.color),
          q("size", p.size),
          q("trans", p.trans ? 1 : 0),
          q("mark", p.mark ? 1 : 0),
          q("head", p.head ? 1 : 0),
        ].join("&");
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForSelector('html[data-render-ready="1"]', { timeout: 15000 }).catch(() => {});
      const el = await page.$(".render-stage");
      const framePath = path.join(tmp, `frame_${String(i).padStart(4, "0")}.png`);
      if (el) await el.screenshot({ path: framePath });
      else await page.screenshot({ path: framePath, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
      frames.push(framePath);
      onProgress(5 + Math.round(((i + 1) / N) * 30), "type");
    }

    // 2) fetch each ayah's recitation audio (server-side, no CORS)
    for (let i = 0; i < N; i++) {
      const res = await fetch(ayahAudioUrl(p.reciter, p.surah, ayahNums[i]));
      if (!res.ok) throw new Error(`Audio ${ayahNums[i]} failed (HTTP ${res.status})`);
      const ap = path.join(tmp, `audio_${String(i).padStart(4, "0")}.mp3`);
      await fs.writeFile(ap, Buffer.from(await res.arrayBuffer()));
      audios.push(ap);
      onProgress(35 + Math.round(((i + 1) / N) * 12), "sync");
    }

    // 3) encode one segment per ayah (image held for the length of its audio)
    const segs: string[] = [];
    for (let i = 0; i < N; i++) {
      const seg = path.join(tmp, `seg_${String(i).padStart(4, "0")}.mp4`);
      await execFileP(
        FF,
        [
          "-y",
          "-loop", "1",
          "-i", frames[i],
          "-i", audios[i],
          "-c:v", "libx264",
          "-tune", "stillimage",
          "-pix_fmt", "yuv420p",
          "-r", "30",
          "-vf", "scale=1080:1920",
          "-c:a", "aac",
          "-b:a", "128k",
          "-shortest",
          seg,
        ],
        { maxBuffer: 1 << 26 }
      );
      segs.push(seg);
      onProgress(47 + Math.round(((i + 1) / N) * 40), "encode");
    }

    // 4) concat segments into the final MP4
    onProgress(90, "final");
    const listPath = path.join(tmp, "list.txt");
    await fs.writeFile(
      listPath,
      segs.map((s) => `file '${s.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n")
    );
    await fs.mkdir(RENDERS_DIR, { recursive: true });
    const outFile = path.join(RENDERS_DIR, `${jobId}.mp4`);
    await execFileP(
      FF,
      ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-movflags", "+faststart", outFile],
      { maxBuffer: 1 << 26 }
    );

    onProgress(100, "final");
    return { url: `/api/render/${jobId}/file`, name: fileBaseName(p), file: outFile };
  } finally {
    if (ctx) await ctx.close().catch(() => {});
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
