"use client";

import { useStudio, type Video } from "@/contexts/StudioContext";
import {
  surah as getSurah,
  reciterObj,
  fontLabel,
  fontFam,
  colorVal,
  toArabicDigits,
} from "@/lib/quran-data";
import { fmtTime } from "@/lib/util";
import type { CSSProperties } from "react";

function snippetOf(v: Video): string {
  const base = v.snippet || getSurah(v.surah).ar;
  return base.split(" ").slice(0, 4).join(" ");
}

export function Library() {
  const { view, library, msg, setView, loadVideoIntoStudio, deleteVideo, sendToAuto, toast, t } = useStudio();

  const relDate = (ms: number) => {
    const diff = Math.floor((Date.now() - ms) / 86400000);
    if (diff <= 0) return msg("Today", "اليوم");
    if (diff === 1) return msg("Yesterday", "أمس");
    return msg(diff + " days ago", "قبل " + toArabicDigits(diff) + " يوم");
  };

  const download = (v: Video) =>
    toast(msg("Downloading ", "جارٍ تنزيل ") + v.name, "info");

  return (
    <section className={"view" + (view === "library" ? " active" : "")} id="view-library">
      <div className="view-head">
        <div>
          <h2>{t("libTitle")}</h2>
          <div className="vh-sub">
            <b>{library.length}</b> {t("libSub")}
          </div>
        </div>
        <button className="btn btn-cyan" onClick={() => setView("studio")}>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span>{t("libNew")}</span>
        </button>
      </div>

      {library.length ? (
        <div className="lib-grid">
          {library.map((v) => {
            const s = getSurah(v.surah);
            const r = reciterObj(v.reciter);
            const thumbStyle = { ["--lc" as string]: colorVal(v.color) } as CSSProperties;
            return (
              <div className="lib-card glass" key={v.id}>
                <div className="lib-thumb" style={thumbStyle} onClick={() => loadVideoIntoStudio(v.id)}>
                  <div className="lt-sname">{s.ar}</div>
                  <div className="lt-verse" style={{ fontFamily: fontFam(v.font) }}>
                    {snippetOf(v)}
                  </div>
                  <div className="lt-dur">{fmtTime(v.dur)}</div>
                  <div className="lt-play">
                    <span>
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M8 5v14l11-7z" fill="currentColor" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="lib-meta">
                  <div className="lm-title">
                    {s.ar} · {s.tr}
                  </div>
                  <div className="lm-info">
                    <span>
                      {msg("Verses ", "الآيات ")}
                      {v.from}–{v.to}
                    </span>
                    <span>{r.en}</span>
                    <span>{fontLabel(v.font)}</span>
                    <span>{relDate(v.date)}</span>
                  </div>
                </div>

                <div className="lib-actions">
                  <button className="btn btn-green" onClick={() => download(v)}>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 4v10m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    <span>{msg("Download", "تنزيل")}</span>
                  </button>
                  <button
                    className="btn btn-gold"
                    title={msg("Send to Auto Quran", "إرسال إلى أوتو قرآن")}
                    onClick={() => sendToAuto(v)}
                  >
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="m21 4-9.5 9.5M21 4l-6 17-4-8-8-4 18-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    className="icon-mini danger"
                    title={msg("Delete", "حذف")}
                    onClick={() => deleteVideo(v.id)}
                  >
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M6 7h12M9 7V5h6v2m-8 0 1 13h8l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="lib-empty glass">
          <span className="le-ic">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="m10 9 5 3-5 3z" fill="currentColor" />
            </svg>
          </span>
          <h3>{t("libEmptyT")}</h3>
          <p>{t("libEmptyS")}</p>
          <button className="btn btn-gold" onClick={() => setView("studio")}>
            <span>{t("libGoStudio")}</span>
          </button>
        </div>
      )}
    </section>
  );
}
