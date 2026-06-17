"use client";

import { useStudio } from "@/contexts/StudioContext";
import { surah as getSurah, toArabicDigits } from "@/lib/quran-data";
import { SurahPicker } from "./SurahPicker";

function Minus() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function Plus() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PassageCard() {
  const { S, changeRange, maxAyah, vWord, lang, t } = useStudio();
  const s = getSurah(S.surah);
  const mx = maxAyah(S.surah);
  const cnt = S.to - S.from + 1;

  return (
    <section className="card glass">
      <div className="card-head">
        <h3>
          <span className="ic">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M5 5h9a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5H5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M19 5h0a0 0 0 0 1 0 0v11.5A2.5 2.5 0 0 0 16.5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span>{t("passage")}</span>
        </h3>
        <span className="hint-r">{t("passageHint")}</span>
      </div>

      <div className="stack">
        <div>
          <label className="lbl">{t("surahLabel")}</label>
          <SurahPicker />
        </div>

        <div className="range-row">
          <div className="range-cell">
            <label className="lbl">{t("fromAyah")}</label>
            <div className="stepper">
              <button type="button" aria-label="decrease" disabled={S.from <= 1} onClick={() => changeRange("from", -1)}>
                <Minus />
              </button>
              <span className="val">{S.from}</span>
              <button type="button" aria-label="increase" disabled={S.from >= S.to} onClick={() => changeRange("from", 1)}>
                <Plus />
              </button>
            </div>
          </div>
          <div className="range-cell">
            <label className="lbl">{t("toAyah")}</label>
            <div className="stepper">
              <button type="button" aria-label="decrease" disabled={S.to <= S.from} onClick={() => changeRange("to", -1)}>
                <Minus />
              </button>
              <span className="val">{S.to}</span>
              <button type="button" aria-label="increase" disabled={S.to >= mx} onClick={() => changeRange("to", 1)}>
                <Plus />
              </button>
            </div>
          </div>
        </div>

        <div className="range-summary">
          <b>{lang === "en" ? cnt : toArabicDigits(cnt)}</b> {vWord(cnt)} ·{" "}
          {lang === "en"
            ? `${s.tr} ${S.from}–${S.to}`
            : `${s.ar} ${toArabicDigits(S.from)}–${toArabicDigits(S.to)}`}
        </div>
      </div>
    </section>
  );
}
