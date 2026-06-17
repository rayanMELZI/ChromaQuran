"use client";

import { useEffect, useRef, useState } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { SURAHS, FEATURED, surah as getSurah, type Surah } from "@/lib/quran-data";

function Star() {
  return (
    <span className="so-star" title="preview ready">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="m12 3 2.4 5.3L20 9l-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6L4 9l5.6-.7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function SurahPicker() {
  const { S, selectSurah, vWord, msg, t } = useStudio();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const sel = getSurah(S.surah);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  /* focus search when opening */
  useEffect(() => {
    if (open) {
      setFilter("");
      const id = setTimeout(() => searchRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);

  const choose = (n: number) => {
    selectSurah(n);
    setOpen(false);
  };

  const f = filter.trim().toLowerCase();
  const match = (s: Surah) =>
    !f ||
    s.tr.toLowerCase().indexOf(f) >= 0 ||
    s.en.toLowerCase().indexOf(f) >= 0 ||
    s.ar.indexOf(filter.trim()) >= 0 ||
    String(s.n) === f;

  const row = (s: Surah) => (
    <div
      key={s.n}
      className={"surah-opt" + (s.n === S.surah ? " sel" : "")}
      onClick={() => choose(s.n)}
    >
      <span className="so-n">{s.n}</span>
      <span className="so-main">
        <span className="so-ar">{s.ar}</span>
        <span className="so-tr">
          {s.tr} · {s.en}
        </span>
      </span>
      {FEATURED.includes(s.n) ? <Star /> : null}
      <span className="so-meta">{s.ayahs}</span>
    </div>
  );

  const filtered = SURAHS.filter(match);

  return (
    <div className={"picker" + (open ? " open" : "")} ref={rootRef}>
      <button className="picker-trigger" type="button" onClick={() => setOpen((o) => !o)}>
        <span className="surah-badge">{sel.n}</span>
        <span className="pt-main">
          <span className="pt-ar">{sel.ar}</span>
          <span className="pt-sub">
            {sel.tr} · {sel.en} · {sel.ayahs} {vWord(sel.ayahs)}
          </span>
        </span>
        <span className="chev">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      <div className="picker-pop glass">
        <div className="picker-search">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
            <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={filter}
            placeholder={t("searchSurah")}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="surah-list">
          {!f ? (
            <>
              <div className="sl-group">{msg("Featured", "مميّزة")}</div>
              {FEATURED.map((n) => row(getSurah(n)))}
              <div className="sl-group">{msg("All 114 surahs", "كل السور ١١٤")}</div>
              {SURAHS.map((s) => row(s))}
            </>
          ) : filtered.length ? (
            filtered.map((s) => row(s))
          ) : (
            <div className="sl-empty">{msg("No surah found", "لا توجد سورة")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
