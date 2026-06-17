import { Ayah, SPEED } from "./quran-data";
import { clamp } from "./util";

export interface Timeline {
  ayahs: Ayah[];
  durs: number[];
  total: number;
}

/** The ayahs of the loaded surah within the chosen [from, to] range. */
export function includedAyahs(ayahs: Ayah[], from: number, to: number): Ayah[] {
  return ayahs.filter((a) => a.n >= from && a.n <= to);
}

/** Per-ayah duration estimate — TEMPORARY until Phase 2 swaps in real audio durations:
 * clamp(2.0 + nonSpaceChars × 0.052, 2.4, 9.5) × reciterSpeedFactor seconds. */
export function ayahDur(arText: string, reciterId: string): number {
  const chars = arText.replace(/\s/g, "").length;
  const sf = SPEED[reciterId] || 1;
  return clamp(2.0 + chars * 0.052, 2.4, 9.5) * sf;
}

export function buildTimeline(
  ayahs: Ayah[],
  from: number,
  to: number,
  reciter: string
): Timeline {
  const inc = includedAyahs(ayahs, from, to);
  const durs = inc.map((a) => ayahDur(a.ar, reciter));
  const total = durs.reduce((x, y) => x + y, 0);
  return { ayahs: inc, durs, total };
}

export function cumIndex(durs: number[], elapsed: number): number {
  let acc = 0;
  for (let i = 0; i < durs.length; i++) {
    acc += durs[i];
    if (elapsed < acc - 0.0001) return i;
  }
  return durs.length - 1;
}

export function ayahStart(durs: number[], i: number): number {
  let acc = 0;
  for (let k = 0; k < i; k++) acc += durs[k];
  return acc;
}
