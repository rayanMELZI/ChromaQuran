/* Share a rendered video straight to Instagram by reusing Auto Quran's existing
 * post_to_instagram.py script (instagrapi clip_upload — posts the reel as-is, no editing).
 * Assumes ChromaQuran and Auto Quran are co-located on the same machine (the user's VM).
 * Configurable via env:
 *   AUTOQURAN_DIR     — path to the Auto Quran project (default: ../../Auto Quran)
 *   AUTOQURAN_PYTHON  — python executable (default: the project's .venv, else `python`)
 * If they're ever deployed separately, swap this spawn for an HTTP call to an Auto Quran endpoint.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export function autoQuranDir(): string {
  return process.env.AUTOQURAN_DIR || path.resolve(process.cwd(), "..", "..", "Auto Quran");
}

function pythonBin(dir: string): string {
  if (process.env.AUTOQURAN_PYTHON) return process.env.AUTOQURAN_PYTHON;
  const candidates = [
    path.join(dir, ".venv", "Scripts", "python.exe"), // Windows
    path.join(dir, ".venv", "bin", "python"), // Linux/macOS
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return "python";
}

export function postScriptPath(dir: string): string {
  return path.join(dir, "logic", "scripts", "post_to_instagram.py");
}

export interface ShareResult {
  ok: boolean;
  output: string;
}

export function shareToInstagram(videoAbsPath: string, caption: string): Promise<ShareResult> {
  const dir = autoQuranDir();
  const script = postScriptPath(dir);
  if (!fs.existsSync(script)) {
    return Promise.resolve({ ok: false, output: `Auto Quran post script not found at ${script}` });
  }
  const py = pythonBin(dir);
  return new Promise((resolve) => {
    let out = "";
    let child;
    try {
      child = spawn(py, [script, videoAbsPath, caption], { cwd: dir });
    } catch (e) {
      resolve({ ok: false, output: `Failed to launch ${py}: ${(e as Error).message}` });
      return;
    }
    child.stdout?.on("data", (d) => (out += d.toString()));
    child.stderr?.on("data", (d) => (out += d.toString()));
    child.on("error", (e) => resolve({ ok: false, output: `Failed to launch ${py}: ${e.message}` }));
    child.on("close", (code) => resolve({ ok: code === 0, output: out.slice(-2000).trim() }));
  });
}
