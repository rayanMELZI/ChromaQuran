/* Walks the whole Quran in daily batches. A batch NEVER spans two surahs.
 * For a surah's final chunk: if >= 3 ayahs remain, post the remainder; if only 1–2
 * remain, post that surah's last `perDay` ayahs instead (so we never post a tiny clip).
 * After the last surah it wraps back to Al-Fatihah and keeps going. */
import { surah as getSurah, SURAHS } from "@/lib/quran-data";

export interface Batch {
  surah: number;
  from: number;
  to: number;
}

export interface BatchResult {
  batch: Batch;
  nextSurah: number;
  nextAyah: number;
}

const MIN_TAIL = 3; // a final chunk smaller than this is replaced by the surah's last `perDay`

export function computeBatch(cursorSurah: number, cursorAyah: number, perDay: number): BatchResult {
  const n = Math.max(1, Math.min(perDay || 7, 10));
  let s = cursorSurah;
  let a = cursorAyah;
  if (s < 1 || s > 114) {
    s = 1;
    a = 1;
  }
  const total = getSurah(s).ayahs;
  if (a < 1 || a > total) a = 1;

  const remaining = total - a + 1;
  let from: number;
  let to: number;
  let finishesSurah: boolean;

  if (remaining > n) {
    // plenty left — take a normal `perDay` chunk and stay in this surah
    from = a;
    to = a + n - 1;
    finishesSurah = false;
  } else if (remaining >= MIN_TAIL) {
    // final chunk of a decent size — post the remainder
    from = a;
    to = total;
    finishesSurah = true;
  } else {
    // only 1–2 ayahs left — post the surah's last `perDay` instead of a tiny clip
    from = Math.max(1, total - n + 1);
    to = total;
    finishesSurah = true;
  }

  let nextSurah = s;
  let nextAyah = to + 1;
  if (finishesSurah || nextAyah > total) {
    nextSurah = s + 1 > 114 ? 1 : s + 1;
    nextAyah = 1;
  }
  return { batch: { surah: s, from, to }, nextSurah, nextAyah };
}

/** 1-based index of an ayah position across the whole Quran (Al-Fatihah:1 == 1). */
export function quranPosition(cursorSurah: number, cursorAyah: number): number {
  let idx = 0;
  for (const s of SURAHS) {
    if (s.n < cursorSurah) idx += s.ayahs;
    else break;
  }
  return idx + cursorAyah;
}

export const TOTAL_AYAHS = SURAHS.reduce((sum, s) => sum + s.ayahs, 0); // 6236
