import type { CSSProperties } from "react";
import type { Ayah } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/quran-data";

/** The 8-point ayah-number medallion drawn after each verse. */
export function AyahMark({ n }: { n: number }) {
  return (
    <span className="ayah-mark">
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4.6" y="4.6" width="14.8" height="14.8" rx="2.6" stroke="currentColor" strokeWidth="1.25" />
        <rect x="4.6" y="4.6" width="14.8" height="14.8" rx="2.6" stroke="currentColor" strokeWidth="1.25" transform="rotate(45 12 12)" />
      </svg>
      <span className="num">{toArabicDigits(n)}</span>
    </span>
  );
}

/** The "REC" frame tag (red dot + "1080×1920 · 9:16"), shown top-left. Optional overlay
 * that can be burned into the exported video; sizes in cqw so it scales preview→export. */
export function FrameTag() {
  return (
    <div className="frame-tag">
      <span className="rec" />
      <span>1080×1920 · 9:16</span>
    </div>
  );
}

/** The black-canvas verse composition (`.comp`). Shared by the live Studio preview
 * and the /render page, so exported video frames are pixel-identical to the preview.
 * The caller supplies the container (`.canvas` in the Studio, `.render-stage` for export). */
export function Composition({
  surahName,
  ayah,
  fontFamily,
  colorValue,
  size,
  trans,
  mark,
  head,
  swapping = false,
  loadingText,
}: {
  surahName: string;
  ayah: Ayah | undefined;
  fontFamily: string;
  colorValue: string;
  size: number;
  trans: boolean;
  mark: boolean;
  head: boolean;
  swapping?: boolean;
  loadingText?: string;
}) {
  const compStyle = { ["--vcolor" as string]: colorValue } as CSSProperties;
  const verseStyle = {
    ["--vfont" as string]: fontFamily,
    ["--vsize" as string]: size + "cqw",
  } as CSSProperties;

  return (
    <div className="comp" style={compStyle}>
      <div className={"comp-head" + (head ? " show" : "")} style={{ display: head ? undefined : "none" }}>
        <div className="ornament">
          <span className="ln" />
          <svg className="star" viewBox="0 0 24 24" fill="none">
            <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
            <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="2.4" stroke="currentColor" strokeWidth="1.5" transform="rotate(45 12 12)" />
          </svg>
          <span className="ln r" />
        </div>
        <div className="sname">{surahName}</div>
      </div>

      <div className="comp-body">
        <div className={"verse" + (swapping ? " swap" : "")} style={verseStyle}>
          {ayah ? (
            <>
              {ayah.ar}
              {mark ? (
                <>
                  {" "}
                  <AyahMark n={ayah.n} />
                </>
              ) : null}
            </>
          ) : loadingText ? (
            loadingText
          ) : null}
        </div>
        <div
          className={"translation" + (swapping ? " swap" : "")}
          style={{ display: trans && ayah ? undefined : "none" }}
        >
          {trans && ayah ? ayah.en : ""}
        </div>
      </div>

      <div className="comp-foot">
        <svg className="wm-mark" viewBox="0 0 24 24" fill="none">
          <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="2.4" stroke="#dcc29c" strokeWidth="1.5" />
          <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="2.4" stroke="#dcc29c" strokeWidth="1.5" transform="rotate(45 12 12)" />
          <circle cx="12" cy="12" r="2" fill="#69c0e6" />
        </svg>
        <span className="wm-id">@wisdomfrom.quran</span>
      </div>
    </div>
  );
}
