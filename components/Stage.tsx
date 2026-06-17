"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { surah as getSurah, colorVal, fontFam, toArabicDigits } from "@/lib/quran-data";
import { ayahAudioUrl } from "@/lib/audio";
import { ayahDur } from "@/lib/timeline";
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
  const { S, TL, lang, msg, loadingSurah, pauseRef, setRecitationTotal } = useStudio();
  const ayahs = TL.ayahs;

  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0); // logical index (drives the counter)
  const [displayIdx, setDisplayIdx] = useState(0); // index whose verse is painted
  const [swapping, setSwapping] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  /* real per-ayah audio + durations */
  const audiosRef = useRef<HTMLAudioElement[]>([]);
  const dursRef = useRef<number[]>([]);
  const totalRef = useRef(0);
  const idxRef = useRef(0);
  const playingRef = useRef(false);
  const rafRef = useRef(0);
  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* DOM refs for high-frequency scrubber updates (mutated directly, never via JSX) */
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const curTimeRef = useRef<HTMLSpanElement>(null);
  const totTimeRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const cumStart = useCallback((i: number) => {
    let acc = 0;
    for (let k = 0; k < i; k++) acc += dursRef.current[k] || 0;
    return acc;
  }, []);

  const recomputeTotal = useCallback(() => {
    totalRef.current = dursRef.current.reduce((x, y) => x + (y || 0), 0);
    if (totTimeRef.current) totTimeRef.current.textContent = fmtTime(totalRef.current);
    setRecitationTotal(Math.round(totalRef.current));
  }, [setRecitationTotal]);

  const updateScrubDOM = useCallback((elapsed: number) => {
    const total = totalRef.current;
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

  const stopRaf = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const tick = useCallback(() => {
    const cur = audiosRef.current[idxRef.current];
    if (cur) updateScrubDOM(cumStart(idxRef.current) + (cur.currentTime || 0));
    rafRef.current = requestAnimationFrame(tick);
  }, [cumStart, updateScrubDOM]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    stopRaf();
    const cur = audiosRef.current[idxRef.current];
    if (cur) cur.pause();
  }, [stopRaf]);

  const playFrom = useCallback(
    (i: number) => {
      const audios = audiosRef.current;
      if (!audios.length) return;
      audios.forEach((a, k) => {
        if (a && k !== i) a.pause();
      });
      const cur = audios[i];
      if (!cur) return;
      cur.preload = "auto";
      if (audios[i + 1]) audios[i + 1].preload = "auto";
      playingRef.current = true;
      setPlaying(true);
      cur.play().catch(() => {});
      stopRaf();
      rafRef.current = requestAnimationFrame(tick);
    },
    [stopRaf, tick]
  );

  const togglePlay = useCallback(() => {
    if (playingRef.current) pause();
    else playFrom(idxRef.current);
  }, [pause, playFrom]);

  const seek = useCallback(
    (elapsed: number) => {
      const durs = dursRef.current;
      const e = clamp(elapsed, 0, totalRef.current);
      let i = 0;
      let acc = 0;
      for (; i < durs.length; i++) {
        if (e < acc + (durs[i] || 0) - 0.0001) break;
        acc += durs[i] || 0;
      }
      if (i >= durs.length) i = Math.max(0, durs.length - 1);
      const cur = audiosRef.current[i];
      if (cur) {
        try {
          cur.currentTime = Math.max(0, e - acc);
        } catch {}
      }
      if (i !== idxRef.current) {
        const prev = audiosRef.current[idxRef.current];
        if (prev) prev.pause();
        goToAyah(i, true);
      }
      updateScrubDOM(e);
      if (playingRef.current) playFrom(i);
    },
    [goToAyah, updateScrubDOM, playFrom]
  );

  const step = useCallback(
    (dir: number) => {
      const i = clamp(idxRef.current + dir, 0, audiosRef.current.length - 1);
      seek(cumStart(i) + 0.001);
    },
    [seek, cumStart]
  );

  /* (re)build the audio set whenever the passage or reciter changes */
  useEffect(() => {
    // teardown previous
    stopRaf();
    if (swapTimer.current) clearTimeout(swapTimer.current);
    audiosRef.current.forEach((a) => {
      if (a) {
        a.pause();
        a.src = "";
      }
    });
    playingRef.current = false;
    setPlaying(false);
    setAudioReady(false);
    idxRef.current = 0;
    setIdx(0);
    setDisplayIdx(0);
    setSwapping(false);

    if (!ayahs.length) {
      audiosRef.current = [];
      dursRef.current = [];
      totalRef.current = 0;
      if (totTimeRef.current) totTimeRef.current.textContent = fmtTime(0);
      updateScrubDOM(0);
      setRecitationTotal(0);
      return;
    }

    // seed with the character-length estimate so the scrubber works immediately,
    // then replace each with the real audio duration as metadata loads
    dursRef.current = ayahs.map((a) => ayahDur(a.ar, S.reciter));
    recomputeTotal();
    updateScrubDOM(0);

    let loaded = 0;
    const audios = ayahs.map((a, i) => {
      const au = new Audio();
      au.preload = "metadata";
      au.src = ayahAudioUrl(S.reciter, S.surah, a.n);
      au.addEventListener("loadedmetadata", () => {
        if (isFinite(au.duration) && au.duration > 0) {
          dursRef.current[i] = au.duration;
          recomputeTotal();
          if (!playingRef.current) {
            const c = audiosRef.current[idxRef.current];
            updateScrubDOM(cumStart(idxRef.current) + (c?.currentTime || 0));
          }
        }
        loaded++;
        if (loaded >= ayahs.length) setAudioReady(true);
      });
      au.addEventListener("error", () => {
        loaded++;
        if (loaded >= ayahs.length) setAudioReady(true);
      });
      au.addEventListener("ended", () => {
        const ci = idxRef.current;
        if (ci < audiosRef.current.length - 1) {
          goToAyah(ci + 1, true);
          playFrom(ci + 1);
        } else {
          pause();
          goToAyah(0, false);
          const first = audiosRef.current[0];
          if (first) first.currentTime = 0;
          updateScrubDOM(0);
        }
      });
      return au;
    });
    audiosRef.current = audios;

    return () => {
      stopRaf();
      audios.forEach((a) => {
        a.pause();
        a.src = "";
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ayahs, S.surah, S.reciter]);

  /* expose pause() so context actions (view switch, library load, surah change) can stop playback */
  useEffect(() => {
    pauseRef.current = pause;
    return () => {
      pauseRef.current = null;
    };
  }, [pause, pauseRef]);

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      stopRaf();
      if (swapTimer.current) clearTimeout(swapTimer.current);
    };
  }, [stopRaf]);

  const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * totalRef.current);
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
          <span className="time end" ref={totTimeRef}>
            0:00
          </span>
        </div>
        <div className="transport-ctrls">
          <button className="tctrl" title="Previous verse" onClick={() => step(-1)}>
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
          <button className="tctrl" title="Next verse" onClick={() => step(1)}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6 6l9 6-9 6zM17 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="ayah-counter">
          {counter}
          {!audioReady && ayahs.length ? (
            <span style={{ opacity: 0.6 }}> · {msg("preparing audio…", "تحضير الصوت…")}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
