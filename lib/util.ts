export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ":" + (s < 10 ? "0" : "") + s;
}
