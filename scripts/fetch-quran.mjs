/* One-time data generator for ChromaQuran.
 * Pulls the full Quran (Uthmani Arabic + Sahih International English) from the free
 * alquran.cloud API and writes one static JSON file per surah to public/data/surahs/{n}.json.
 * Run once: `node scripts/fetch-quran.mjs`. The app then loads these files on demand
 * (no runtime API calls — offline, fast, served straight by nginx in production).
 *
 * Note: the quran-uthmani edition prepends the Basmala to verse 1 of most surahs
 * (except Al-Fatihah, where the Basmala is verse 1, and At-Tawbah, which has none).
 * Some surahs encode it with diacritic variations (e.g. 95 & 97 use a shadda'd bāʾ),
 * so we detect the Basmala by its consonant skeleton (first four words) and strip it,
 * leaving each ayah to render cleanly on its own.
 */
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "public/data/surahs";

/* combining marks: harakat, tanwin, shadda, sukun, superscript/dagger alef, Quranic annotations */
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g;

/* consonant skeleton: drop marks, normalize alef variants (ٱأإآ → ا), drop spaces */
function skeleton(s) {
  return s.replace(MARKS, "").replace(/[ٱأإآ]/g, "ا").replace(/\s+/g, "");
}
const BASMALA_SKEL = skeleton("بسم الله الرحمن الرحيم");

/* Strip BOM, normalize combining-mark order (NFC), trim. */
function clean(s) {
  return (s || "").replace(/﻿/g, "").normalize("NFC").trim();
}

/* Drop a leading Basmala from verse 1 (all surahs except Al-Fatihah). */
function stripBasmala(text, surahNumber) {
  if (surahNumber === 1) return text;
  const words = text.split(/\s+/);
  if (words.length > 4 && skeleton(words.slice(0, 4).join("")) === BASMALA_SKEL) {
    return words.slice(4).join(" ").trim();
  }
  return text;
}

async function getEdition(id) {
  const r = await fetch(`https://api.alquran.cloud/v1/quran/${id}`);
  if (!r.ok) throw new Error(`${id}: HTTP ${r.status}`);
  const j = await r.json();
  if (j.code !== 200 || !j.data?.surahs) throw new Error(`${id}: unexpected payload`);
  return j.data.surahs; // [{ number, ayahs: [{ numberInSurah, text }] }]
}

console.log("Fetching Uthmani Arabic + Sahih English…");
const [ar, en] = await Promise.all([getEdition("quran-uthmani"), getEdition("en.sahih")]);

mkdirSync(OUT, { recursive: true });

let totalAyahs = 0;
let strippedBasmala = 0;

for (let i = 0; i < ar.length; i++) {
  const n = ar[i].number;
  const arAyahs = ar[i].ayahs;
  const enAyahs = en[i].ayahs;
  if (arAyahs.length !== enAyahs.length) {
    console.warn(`! surah ${n}: ayah count mismatch ar=${arAyahs.length} en=${enAyahs.length}`);
  }
  const ayahs = arAyahs.map((a, k) => {
    let arabic = clean(a.text);
    const stripped = stripBasmala(arabic, n);
    if (stripped !== arabic) strippedBasmala++;
    return { n: a.numberInSurah, ar: stripped, en: clean(enAyahs[k]?.text) };
  });
  totalAyahs += ayahs.length;
  writeFileSync(`${OUT}/${n}.json`, JSON.stringify({ n, ayahs }));
}

console.log(`✓ wrote ${ar.length} surah files to ${OUT}`);
console.log(`  total ayahs: ${totalAyahs} (expected 6236)`);
console.log(`  basmala prefixes stripped from verse 1: ${strippedBasmala} (expected 112)`);
