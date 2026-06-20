/* Share a rendered video to Instagram via the Auto Quran HTTP API.
 * Auto Quran exposes POST /api/post-video (multipart: `video` file + `caption`) which
 * publishes the reel as-is, skipping its own download/extract/compose pipeline — exactly
 * what ChromaQuran wants, since it already rendered the finished video itself.
 * Going over HTTP (not a local script spawn) means the two apps can live on different boxes.
 * Configurable via env:
 *   AUTOQURAN_API_URL — base URL of the Auto Quran backend (default http://localhost:5000)
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

export function autoQuranApiUrl(): string {
  return (process.env.AUTOQURAN_API_URL || "http://localhost:5000").replace(/\/+$/, "");
}

export interface ShareResult {
  ok: boolean;
  output: string;
}

export async function shareToInstagram(videoAbsPath: string, caption: string): Promise<ShareResult> {
  const url = `${autoQuranApiUrl()}/api/post-video`;

  let buf: Buffer;
  try {
    buf = await readFile(videoAbsPath);
  } catch (e) {
    return { ok: false, output: `Could not read video: ${(e as Error).message}` };
  }

  const form = new FormData();
  form.append("video", new Blob([new Uint8Array(buf)], { type: "video/mp4" }), path.basename(videoAbsPath));
  form.append("caption", caption);

  try {
    const res = await fetch(url, { method: "POST", body: form });
    let data: { success?: boolean; message?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* non-JSON response */
    }
    if (res.ok && data.success) return { ok: true, output: data.message || "Posted" };
    return { ok: false, output: data.message || `Auto Quran returned ${res.status}` };
  } catch (e) {
    return { ok: false, output: `Could not reach Auto Quran at ${url}: ${(e as Error).message}` };
  }
}
