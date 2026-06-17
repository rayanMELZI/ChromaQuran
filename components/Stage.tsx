"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { surah as getSurah, colorVal, fontFam, toArabicDigits } from "@/lib/quran-data";
import { cumIndex, ayahStart, type Timeline } from "@/lib/timeline";
import { fmtTime, clamp } from "@/lib/util";

function AyahMark({ n }: { n: number }) {
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

export function Stage() {
  const { S, TL, lang, msg, loadingSurah, pauseRef } = useStudio();

  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0); // logical index (drives the counter)
  const [displayIdx, setDisplayIdx] = useState(0); // index whose verse is painted
  const [swapping, setSwapping] = useState(false);

  /* refs to avoid stale closures inside the rAF loop */
  const tlRef = useRef<Timeline>(TL);
  tlRef.current = TL;
  const elapsedRef = useRef(0);
  const t0Ref = useRef(0);
  const rafRef = useRef(0);
  const idxRef = useRef(0);
  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* DOM refs for high-frequency scrubber updates (mutated directly, never via JSX) */
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const curTimeRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const updateScrubDOM = useCallback((elapsed: number) => {
    const total = tlRef.current.total;
    const pct = total ? clamp(elapsed / total, 0, 1) * 100 : 0;
    if (fillRef.current) fillRef.current.style.width = pct + "%";
    if (knobRef.current) knobRef.current.style.left = pct + "%";
    if (curTimeRef.current) curTimeRef.current.textContent = fmtTime(elapsed);
  }, []);

  const goToAyah = useCallback((i: number, animate: boolean) => {
    idxRef.current = i;
    setIdx(i);
    if (swapTimer.current) clearTimeout(swapTimer.current);
    if (animate) {
      setSwapping(true);
      swapTimer.current = setTimeout(() => {
        setDisplayIdx(i);
        requestAnimationFrame(() => setSwapping(false));
      }, 170);
    } else {
      setDisplayIdx(i);
      setSwapping(false);
    }
  }, []);

  const pause = useCallback(() => {
    setPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const loop = useCallback(() => {
    const tl = tlRef.current;
    elapsedRef.current = (performance.now() - t0Ref.current) / 1000;
    if (elapsedRef.current >= tl.total) {
      elapsedRef.current = tl.total;
      updateScrubDOM(tl.total);
      const li = tl.durs.length - 1;
      if (li !== idxRef.current) goToAyah(li, true);
      pause();
      elapsedRef.current = 0;
      if (endTimer.current) clearTimeout(endTimer.current);
      endTimer.current = setTimeout(() => {
        updateScrubDOM(0);
        goToAyah(0, false);
      }, 400);
      return;
    }
    const i = cumIndex(tl.durs, elapsedRef.current);
    if (i !== idxRef.current) goToAyah(i, true);
    updateScrubDOM(elapsedRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [updateScrubDOM, goToAyah, pause]);

  const start = useCallback(() => {
    if (tlRef.current.total <= 0) return;
    setPlaying(true);
    t0Ref.current = performance.now() - elapsedRef.current * 1000;
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const togglePlay = useCallback(() => {
    if (rafRef.current) pause();
    else start();
  }, [pause, start]);

  const seek = useCallback(
    (elapsed: number) => {
      const tl = tlRef.current;
      elapsedRef.current = clamp(elapsed, 0, tl.total);
      const i = cumIndex(tl.durs, elapsedRef.current);
      if (i !== idxRef.current) goToAyah(i, true);
      if (rafRef.current) t0Ref.current = performance.now() - elapsedRef.current * 1000;
      updateScrubDOM(elapsedRef.current);
    },
    [goToAyah, updateScrubDOM]
  );

  const stepAyah = useCallback(
    (dir: number) => {
      const tl = tlRef.current;
      const i = clamp(idxRef.current + dir, 0, tl.ayahs.length - 1);
      seek(ayahStart(tl.durs, i) + 0.001);
    },
    [seek]
  );

  /* reset to start whenever the timeline changes (surah / range / reciter) */
  useEffect(() => {
    pause();
    if (swapTimer.current) clearTimeout(swapTimer.current);
    if (endTimer.current) clearTimeout(endTimer.current);
    elapsedRef.current = 0;
    idxRef.current = 0;
    setIdx(0);
    setDisplayIdx(0);
    setSwapping(false);
    updateScrubDOM(0);
  }, [TL, pause, updateScrubDOM]);

  /* expose pause() so context actions (view switch, library load) can stop playback */
  useEffect(() => {
    pauseRef.current = pause;
    return () => {
      pauseRef.current = null;
    };
  }, [pause, pauseRef]);

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (swapTimer.current) clearTimeout(swapTimer.current);
      if (endTimer.current) clearTimeout(endTimer.current);
    };
  }, []);

  const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * tlRef.current.total);
  };

  /* ---- render ---- */
  const s = getSurah(S.surah);
  const a = TL.ayahs[displayIdx];
  const counterAyah = TL.ayahs[idx];
  const compStyle = { ["--vcolor" as string]: colorVal(S.color) } as CSSProperties;
  const verseStyle = {
    ["--vfont" as string]: fontFam(S.font),
    ["--vsize" as string]: S.size + "cqw",
  } as CSSProperties;

  let counter = "";
  if (counterAyah) {
    counter =
      lang === "en"
        ? "Verse " + counterAyah.n + " · " + (idx + 1) + " of " + TL.ayahs.length
        : "الآية " +
          toArabicDigits(counterAyah.n) +
          " · " +
          toArabicDigits(idx + 1) +
          " من " +
          toArabicDigits(TL.ayahs.length);
  }

  return (
    <div className="stage-col">
      <div className="stage-wrap">
        <div className={"canvas" + (playing ? " playing" : "")}>
          <div className="frame-tag">
            <span className="rec" />
            <span>1080×1920 · 9:16</span>
          </div>
          <div className="comp" style={compStyle}>
            <div className={"comp-head" + (S.head ? " show" : "")} style={{ display: S.head ? undefined : "none" }}>
              <div className="ornament">
                <span className="ln" />
                <svg className="star" viewBox="0 0 24 24" fill="none">
                  <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="2.4" stroke="currentColor" strokeWidth="1.5" transform="rotate(45 12 12)" />
                </svg>
                <span className="ln r" />
              </div>
              <div className="sname">{s.ar}</div>
            </div>

            <div className="comp-body">
              <div className={"verse" + (swapping ? " swap" : "")} style={verseStyle}>
                {a ? (
                  <>
                    {a.ar}
                    {S.mark ? (
                      <>
                        {" "}
                        <AyahMark n={a.n} />
                      </>
                    ) : null}
                  </>
                ) : loadingSurah ? (
                  msg("Loading…", "جارٍ التحميل…")
                ) : null}
              </div>
              <div
                className={"translation" + (swapping ? " swap" : "")}
                style={{ display: S.trans && a ? undefined : "none" }}
              >
                {S.trans && a ? a.en : ""}
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
        </div>
      </div>

      <div className="transport">
        <div className="scrub">
          <span className="time" ref={curTimeRef}>
            0:00
          </span>
          <div className="track" ref={trackRef} onClick={onTrackClick}>
            <div className="fill" ref={fillRef} />
            <div className="knob" ref={knobRef} />
          </div>
          <span className="time end">{fmtTime(TL.total)}</span>
        </div>
        <div className="transport-ctrls">
          <button className="tctrl" title="Previous verse" onClick={() => stepAyah(-1)}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 6 9 12l9 6zM7 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </button>
          <button className="tctrl play" title="Play" onClick={togglePlay}>
            <svg viewBox="0 0 24 24" fill="none">
              {playing ? (
                <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" />
              ) : (
                <path d="M8 5v14l11-7z" fill="currentColor" />
              )}
            </svg>
          </button>
          <button className="tctrl" title="Next verse" onClick={() => stepAyah(1)}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6 6l9 6-9 6zM17 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="ayah-counter">{counter}</div>
      </div>
    </div>
  );
}
