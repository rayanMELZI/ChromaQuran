import fs from "node:fs/promises";
import path from "node:path";
import { surah as getSurah, fontFam, colorVal, type Ayah } from "@/lib/quran-data";
import { RenderFrame } from "@/components/RenderFrame";

/* Offscreen route the render worker navigates to (one ayah per screenshot).
 * Params: surah, ayah (verse number), font, color, size, trans, mark, head. */
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (sp: SP, k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]);

export default async function RenderPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const num = (k: string, d: number) => {
    const n = parseFloat(String(one(sp, k)));
    return isFinite(n) ? n : d;
  };
  const flag = (k: string, d: boolean) => {
    const v = one(sp, k);
    return v == null ? d : v === "1" || v === "true";
  };
  const str = (k: string, d: string) => {
    const v = one(sp, k);
    return v == null ? d : String(v);
  };

  const surahNum = num("surah", 1);
  const ayahNum = num("ayah", 1);

  let ayah: Ayah | undefined;
  try {
    const file = path.join(process.cwd(), "public", "data", "surahs", `${surahNum}.json`);
    const data = JSON.parse(await fs.readFile(file, "utf8")) as { ayahs: Ayah[] };
    ayah = data.ayahs.find((a) => a.n === ayahNum);
  } catch {
    ayah = undefined;
  }

  const s = getSurah(surahNum);

  return (
    <RenderFrame
      surahName={s ? s.ar : ""}
      ayah={ayah}
      fontFamily={fontFam(str("font", "amiri"))}
      colorValue={colorVal(str("color", "warm"))}
      size={num("size", 8.4)}
      trans={flag("trans", false)}
      mark={flag("mark", true)}
      head={flag("head", true)}
      frameTag={flag("frameTag", false)}
    />
  );
}
