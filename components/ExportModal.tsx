"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useStudio, type Video } from "@/contexts/StudioContext";
import { surah as getSurah, reciterObj, fontLabel, fontFam, colorVal } from "@/lib/quran-data";

type StageId = "prep" | "type" | "sync" | "encode" | "final";
type Status = "idle" | "queued" | "running" | "done" | "error";

const STAGES: { id: StageId; key: string; icon: React.ReactNode }[] = [
  { id: "prep", key: "stPrep", icon: (<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" /></svg>) },
  { id: "type", key: "stType", icon: (<svg viewBox="0 0 24 24" fill="none"><path d="M6 7h12M12 7v11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>) },
  { id: "sync", key: "stSync", icon: (<svg viewBox="0 0 24 24" fill="none"><path d="M3 12h4l3-7 4 14 3-7h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
  { id: "encode", key: "stEncode", icon: (<svg viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 1 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M4 17v-5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
  { id: "final", key: "stFinal", icon: (<svg viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
];

export function ExportModal() {
  const { exportOpen, setExportOpen, S, TL, recitationTotal, addToLibrary, toast, msg, t } = useStudio();

  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<StageId>("prep");
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [doneName, setDoneName] = useState("video.mp4");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const lastVideoRef = useRef<Video | null>(null);

  const rendering = status === "queued" || status === "running";
  const renderingRef = useRef(rendering);
  renderingRef.current = rendering;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* latest values for the async finish payload */
  const ctxRef = useRef({ S, TL, recitationTotal, addToLibrary, toast, msg });
  ctxRef.current = { S, TL, recitationTotal, addToLibrary, toast, msg };

  /* kick off a real render job when the modal opens */
  useEffect(() => {
    if (!exportOpen) return;
    let cancelled = false;
    setProgress(0);
    setStage("prep");
    setStatus("queued");
    setErrMsg("");
    setDownloadUrl(null);
    lastVideoRef.current = null;

    const { S: cs } = ctxRef.current;
    const params = {
      surah: cs.surah, from: cs.from, to: cs.to, reciter: cs.reciter,
      font: cs.font, color: cs.color, size: cs.size,
      trans: cs.trans, mark: cs.mark, head: cs.head, frameTag: cs.frameTag,
    };

    const fail = (m: string) => {
      if (cancelled) return;
      setStatus("error");
      setErrMsg(m);
      ctxRef.current.toast(ctxRef.current.msg("Render failed", "فشلت المعالجة"), "warn");
    };

    (async () => {
      try {
        const r = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const data = await r.json();
        if (!r.ok || !data.id) throw new Error(data.error || "Could not start render");
        if (cancelled) return;
        pollRef.current = setInterval(async () => {
          try {
            const sr = await fetch(`/api/render/${data.id}`);
            const j = await sr.json();
            if (cancelled) return;
            setProgress(j.progress || 0);
            if (j.stage) setStage(j.stage);
            setStatus(j.status);
            if (j.status === "done") {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              const { TL: ctl, recitationTotal: rt, addToLibrary: add, toast: tst, msg: m } = ctxRef.current;
              const video: Video = {
                id: "v" + Date.now(),
                surah: params.surah, from: params.from, to: params.to,
                reciter: params.reciter, font: params.font, color: params.color,
                dur: rt || Math.round(ctl.total),
                date: Date.now(),
                snippet: ctl.ayahs[0] ? ctl.ayahs[0].ar : "",
                name: j.name || "chromaquran.mp4",
                url: j.url,
              };
              lastVideoRef.current = video;
              setDoneName(video.name);
              setDownloadUrl(j.url || null);
              add(video);
              tst(m("Render complete — saved to library", "اكتملت المعالجة — حُفظت في المكتبة"), "ok");
            } else if (j.status === "error") {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              fail(j.error || "Render failed");
            }
          } catch {
            /* transient poll error — keep polling */
          }
        }, 500);
      } catch (e) {
        fail(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportOpen]);

  const requestClose = () => {
    if (renderingRef.current) return;
    setExportOpen(false);
  };

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
  const stageIdx = STAGES.findIndex((x) => x.id === stage);
  const done = status === "done";
  const rowStatus = (i: number): string => {
    if (done) return "done";
    if (i < stageIdx) return "done";
    if (i === stageIdx && rendering) return "run";
    return "";
  };

  const onShareInstagram = async () => {
    const v = lastVideoRef.current;
    const m = v?.url?.match(/render\/(job_[a-z0-9]+)\/file/i);
    const jobId = m?.[1];
    if (!v || !jobId) return;
    const sName = getSurah(v.surah);
    const caption = `${sName.ar} (${sName.tr}) ${v.from}-${v.to}\n${reciterObj(v.reciter).en}\n\n#Quran #القرآن #تلاوة`;
    setSharing(true);
    toast(msg("Sharing to Instagram…", "جارٍ النشر على إنستغرام…"), "info");
    try {
      const r = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, caption }),
      });
      const data = await r.json();
      if (r.ok && data.ok) toast(msg("Posted to Instagram", "تم النشر على إنستغرام"), "ok");
      else
        toast(
          msg("Instagram share failed", "تعذّر النشر على إنستغرام") +
            (data?.error ? ` — ${String(data.error).slice(0, 100)}` : ""),
          "warn"
        );
    } catch {
      toast(msg("Instagram share failed", "تعذّر النشر على إنستغرام"), "warn");
    } finally {
      setSharing(false);
    }
  };

  const onSendAuto = () => {
    if (lastVideoRef.current) {
      try {
        localStorage.setItem("cq_handoff", JSON.stringify(lastVideoRef.current));
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
            <div className="es-row"><span className="es-k">{t("sumPassage")}</span><span className="es-v">{s.tr} {S.from}–{S.to}</span></div>
            <div className="es-row"><span className="es-k">{t("sumReciter")}</span><span className="es-v">{reciterObj(S.reciter).en}</span></div>
            <div className="es-row"><span className="es-k">{t("sumFont")}</span><span className="es-v">{fontLabel(S.font)}</span></div>
            <div className="es-row"><span className="es-k">{t("sumFormat")}</span><span className="es-v">1080×1920 · MP4</span></div>
          </div>
        </div>

        <div className="render-stages">
          {STAGES.map((st, i) => (
            <div className={"rstage " + rowStatus(i)} key={st.id} data-stage={st.id}>
              <span className="rs-ic">{st.icon}</span>
              <span>{t(st.key)}</span>
            </div>
          ))}
        </div>
        <div className="render-prog">
          <div className="rp-fill" style={{ width: progress + "%" }} />
        </div>
        <div className="render-pct">{Math.round(progress)}%</div>

        {status === "error" ? (
          <div className="done-banner" style={{ background: "rgba(240,163,163,.1)", borderColor: "rgba(240,163,163,.3)" }}>
            <span className="db-ic" style={{ background: "linear-gradient(135deg,#f0a3a3,#d98a8a)" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 8v5m0 3h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </span>
            <span>{msg("Render failed", "فشلت المعالجة")} — {errMsg}</span>
          </div>
        ) : null}

        <div className={"exp-done" + (done ? " show" : "")}>
          <div className="done-banner">
            <span className="db-ic">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span><b>{doneName}</b> · {t("doneReady")}</span>
          </div>
        </div>
        <div className={"exp-actions" + (done ? " show" : "")}>
          <a className="btn btn-green exp-primary" href={downloadUrl || "#"} download={doneName}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 4v10m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 19h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <span>{t("doDownload")}</span>
          </a>
          <div className="exp-secondary">
            <button className="btn btn-ig" onClick={onShareInstagram} disabled={sharing}>
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" />
              </svg>
              <span>{sharing ? t("sharing") : t("shareIg")}</span>
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
    </div>
  );
}
