"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useStudio, type Video } from "@/contexts/StudioContext";
import { surah as getSurah, reciterObj, fontLabel, fontFam, colorVal } from "@/lib/quran-data";

type StageId = "prep" | "type" | "sync" | "encode" | "final";
type StageStatus = "pending" | "run" | "done";

const STAGES: { id: StageId; key: string; icon: React.ReactNode }[] = [
  {
    id: "prep",
    key: "stPrep",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: "type",
    key: "stType",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6 7h12M12 7v11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "sync",
    key: "stSync",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 12h4l3-7 4 14 3-7h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "encode",
    key: "stEncode",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 12a8 8 0 1 1 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 17v-5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "final",
    key: "stFinal",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const WEIGHTS = [12, 22, 20, 38, 8];
const ALL_PENDING: Record<StageId, StageStatus> = {
  prep: "pending",
  type: "pending",
  sync: "pending",
  encode: "pending",
  final: "pending",
};

export function ExportModal() {
  const { exportOpen, setExportOpen, S, TL, recitationTotal, addToLibrary, toast, msg, t } = useStudio();

  const [progress, setProgress] = useState(0);
  const [statuses, setStatuses] = useState<Record<StageId, StageStatus>>(ALL_PENDING);
  const [done, setDone] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [lastVideo, setLastVideo] = useState<Video | null>(null);
  const [doneName, setDoneName] = useState("video.mp4");

  const renderingRef = useRef(false);
  const intervals = useRef<ReturnType<typeof setInterval>[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /* latest context values for the async render finish payload */
  const ctxRef = useRef({ S, TL, recitationTotal, addToLibrary, toast, msg });
  ctxRef.current = { S, TL, recitationTotal, addToLibrary, toast, msg };

  const clearAll = () => {
    intervals.current.forEach((i) => clearInterval(i));
    timers.current.forEach((tm) => clearTimeout(tm));
    intervals.current = [];
    timers.current = [];
  };

  /* run the staged render simulation when the modal opens */
  useEffect(() => {
    if (!exportOpen) return;

    renderingRef.current = true;
    setRendering(true);
    setDone(false);
    setProgress(0);
    setStatuses(ALL_PENDING);
    setLastVideo(null);

    const stageIds: StageId[] = STAGES.map((s) => s.id);
    let idx = 0;
    let prog = 0;

    const finish = () => {
      setProgress(100);
      const { S: cs, TL: ctl, recitationTotal: rt, addToLibrary: add, toast: tst, msg: m } = ctxRef.current;
      const s = getSurah(cs.surah);
      const name =
        "chromaquran-" + s.tr.toLowerCase().replace(/[^a-z]/g, "") + "-" + cs.from + "-" + cs.to + ".mp4";
      const video: Video = {
        id: "v" + Date.now(),
        surah: cs.surah,
        from: cs.from,
        to: cs.to,
        reciter: cs.reciter,
        font: cs.font,
        color: cs.color,
        dur: Math.round(rt || ctl.total),
        date: Date.now(),
        snippet: ctl.ayahs[0] ? ctl.ayahs[0].ar : "",
        name,
      };
      setLastVideo(video);
      setDoneName(name);
      const to = setTimeout(() => {
        setDone(true);
        renderingRef.current = false;
        setRendering(false);
        add(video);
        tst(m("Render complete — saved to library", "اكتملت المعالجة — حُفظت في المكتبة"), "ok");
      }, 400);
      timers.current.push(to);
    };

    const stage = () => {
      if (idx >= stageIds.length) {
        finish();
        return;
      }
      const id = stageIds[idx];
      setStatuses((prev) => ({ ...prev, [id]: "run" }));
      const target = prog + WEIGHTS[idx];
      const iv = setInterval(() => {
        prog = Math.min(target, prog + Math.random() * 4 + 1.5);
        setProgress(prog);
        if (prog >= target) {
          clearInterval(iv);
          setStatuses((prev) => ({ ...prev, [id]: "done" }));
          idx++;
          const to = setTimeout(stage, 160);
          timers.current.push(to);
        }
      }, 70);
      intervals.current.push(iv);
    };
    stage();

    return () => {
      clearAll();
      renderingRef.current = false;
    };
  }, [exportOpen]);

  const requestClose = () => {
    if (renderingRef.current) return;
    setExportOpen(false);
  };

  /* Esc to close */
  useEffect(() => {
    if (!exportOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportOpen]);

  const s = getSurah(S.surah);
  const a0 = TL.ayahs[0];
  const miniStyle = { ["--ec" as string]: colorVal(S.color) } as CSSProperties;

  const onDownload = () =>
    toast(msg("Downloading ", "جارٍ تنزيل ") + (lastVideo ? lastVideo.name : "video.mp4"), "info");
  const onSendAuto = () => {
    if (lastVideo) {
      try {
        localStorage.setItem("cq_handoff", JSON.stringify(lastVideo));
      } catch {}
    }
    toast(msg("Sent to Auto Quran — ready to post", "أُرسل إلى أوتو قرآن — جاهز للنشر"), "ok");
    setExportOpen(false);
  };

  return (
    <div
      className={"modal-overlay" + (exportOpen ? " open" : "")}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div className="modal glass" role="dialog" aria-modal="true" aria-label="Export video">
        <div className="modal-head">
          <h3>
            <span className="ic">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 4v10m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 19h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <span>{t("exportTitle")}</span>
          </h3>
          <button className="icon-btn" aria-label="Close" disabled={rendering} onClick={requestClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="exp-preview">
          <div className="exp-mini" style={miniStyle}>
            <div className="em-v" style={{ fontFamily: fontFam(S.font) }}>
              {a0 ? a0.ar.split(" ").slice(0, 3).join(" ") : ""}
            </div>
          </div>
          <div className="exp-summary">
            <div className="es-row">
              <span className="es-k">{t("sumPassage")}</span>
              <span className="es-v">
                {s.tr} {S.from}–{S.to}
              </span>
            </div>
            <div className="es-row">
              <span className="es-k">{t("sumReciter")}</span>
              <span className="es-v">{reciterObj(S.reciter).en}</span>
            </div>
            <div className="es-row">
              <span className="es-k">{t("sumFont")}</span>
              <span className="es-v">{fontLabel(S.font)}</span>
            </div>
            <div className="es-row">
              <span className="es-k">{t("sumFormat")}</span>
              <span className="es-v">1080×1920 · MP4</span>
            </div>
          </div>
        </div>

        <div className="render-stages">
          {STAGES.map((st) => (
            <div className={"rstage " + statuses[st.id]} key={st.id} data-stage={st.id}>
              <span className="rs-ic">{st.icon}</span>
              <span>{t(st.key)}</span>
            </div>
          ))}
        </div>
        <div className="render-prog">
          <div className="rp-fill" style={{ width: progress + "%" }} />
        </div>
        <div className="render-pct">{Math.round(progress)}%</div>

        <div className={"exp-done" + (done ? " show" : "")}>
          <div className="done-banner">
            <span className="db-ic">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>
              <b>{doneName}</b> · {t("doneReady")}
            </span>
          </div>
        </div>
        <div className={"exp-actions" + (done ? " show" : "")}>
          <button className="btn btn-green" onClick={onDownload}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 4v10m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 19h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <span>{t("doDownload")}</span>
          </button>
          <button className="btn btn-gold" onClick={onSendAuto}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 12a8 8 0 0 1 13.7-5.6M20 12A8 8 0 0 1 6.3 17.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M18 3v3.4h-3.4M6 21v-3.4h3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{t("doSendAuto")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
