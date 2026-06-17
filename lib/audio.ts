/* ChromaQuran — recitation audio source.
 * Per-ayah MP3 files from everyayah.com (free, predictable URLs, da'wah use).
 * URL shape: https://everyayah.com/data/{folder}/{SSS}{AAA}.mp3  (3-digit surah + ayah)
 * Folder slugs verified against everyayah.com. Playback uses plain <audio> (no CORS
 * needed for play + duration). The render worker (Phase 3) fetches these server-side.
 */

export const EVERYAYAH_BASE = "https://everyayah.com/data";

/** reciter id (see RECITERS in quran-data) → everyayah folder slug */
export const RECITER_AUDIO: Record<string, string> = {
  alafasy: "Alafasy_128kbps",
  abdulbasit: "Abdul_Basit_Murattal_192kbps",
  muaiqly: "MaherAlMuaiqly128kbps",
  minshawi: "Minshawy_Murattal_128kbps",
  husary: "Husary_128kbps",
  sudais: "Abdurrahmaan_As-Sudais_192kbps",
  ghamdi: "Ghamadi_40kbps",
  shuraim: "Saood_ash-Shuraym_128kbps",
  basfar: "Abdullah_Basfar_192kbps",
  hudhaify: "Hudhaify_128kbps",
  ayyoub: "Muhammad_Ayyoub_128kbps",
  qatami: "Nasser_Alqatami_128kbps",
  dossari: "Yasser_Ad-Dussary_128kbps",
};

const pad3 = (n: number) => String(n).padStart(3, "0");

export function ayahAudioUrl(reciterId: string, surah: number, ayah: number): string {
  const folder = RECITER_AUDIO[reciterId] || RECITER_AUDIO.alafasy;
  return `${EVERYAYAH_BASE}/${folder}/${pad3(surah)}${pad3(ayah)}.mp3`;
}
