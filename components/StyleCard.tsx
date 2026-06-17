"use client";

import { useStudio } from "@/contexts/StudioContext";
import { FONTS, COLORS } from "@/lib/quran-data";

export function StyleCard() {
  const { S, setFont, setColor, setSize, t } = useStudio();

  return (
    <section className="card glass">
      <div className="card-head">
        <h3>
          <span className="ic gold">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M5 19 19 5M9 5H5v4M19 15v4h-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 4 8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span>{t("style")}</span>
        </h3>
        <span className="hint-r">{t("styleHint")}</span>
      </div>

      <div className="stack">
        <div>
          <label className="lbl">{t("fontLabel")}</label>
          <div className="font-grid">
            {FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={"font-tile" + (f.id === S.font ? " sel" : "")}
                onClick={() => setFont(f.id)}
              >
                <div className="ft-prev" style={{ fontFamily: f.family }}>
                  بِسْمِ ٱللَّه
                </div>
                <div className="ft-label">{f.label}</div>
                <div className="ft-note">{f.note}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="divider" />

        <div>
          <div className="row between" style={{ marginBottom: "9px" }}>
            <label className="lbl" style={{ margin: 0 }}>
              {t("sizeLabel")}
            </label>
          </div>
          <div className="slider-row">
            <input
              type="range"
              className="slider"
              min={6.2}
              max={11.5}
              step={0.1}
              value={S.size}
              onChange={(e) => setSize(parseFloat(e.target.value))}
            />
            <span className="slider-val">{S.size.toFixed(1)}</span>
          </div>
        </div>

        <div>
          <label className="lbl">{t("colorLabel")}</label>
          <div className="color-row">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={"swatch" + (c.id === S.color ? " sel" : "")}
                onClick={() => setColor(c.id)}
              >
                <span className="dot" style={{ background: c.value }} />
                <span className="sw-l">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
