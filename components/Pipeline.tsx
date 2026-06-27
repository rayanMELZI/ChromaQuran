"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStudio } from "@/contexts/StudioContext";

/* ── types ── */
interface PipelineState {
  has_image: boolean;
  has_video: boolean;
  has_overlay: boolean;
  has_final: boolean;
  video_title: string;
}

type StepStatus = "pending" | "processing" | "completed" | "skipped" | "error";

interface StepProgress {
  status: StepStatus;
  progress: number;
  message: string;
}

interface Progress {
  active: boolean;
  overall_percent: number;
  overall_message: string;
  current_step: string;
  steps: Record<string, StepProgress>;
}

interface PipelineSettings {
  default_channel_url: string;
  default_keyword: string;
  default_caption: string;
}

const NODE_KEYS = ["image", "video", "overlay", "final", "post"] as const;

function nodeColor(status: StepStatus | undefined): string {
  if (status === "completed" || status === "skipped") return "var(--gold)";
  if (status === "processing") return "var(--cyan)";
  if (status === "error") return "#f56565";
  return "rgba(255,255,255,0.12)";
}

function StepPill({ status, active }: { status: StepStatus | undefined; active: boolean }) {
  let label = "pending";
  let bg = "rgba(255,255,255,0.06)";
  let color = "var(--faint)";
  if (active && status === "processing") {
    label = "running"; bg = "rgba(0,229,255,0.12)"; color = "var(--cyan)";
  } else if (status === "completed" || status === "skipped") {
    label = "done"; bg = "rgba(212,175,55,0.12)"; color = "var(--gold)";
  } else if (status === "error") {
    label = "error"; bg = "rgba(245,101,101,0.12)"; color = "#f56565";
  }
  return (
    <span style={{
      fontSize: "0.68rem", padding: "3px 9px", borderRadius: 20,
      background: bg, color, border: `1px solid ${bg}`,
    }}>
      {label}
    </span>
  );
}

function StepNum({ n, status }: { n: number; status: StepStatus | undefined }) {
  const done = status === "completed" || status === "skipped";
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 6, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: done ? "var(--gold)" : status === "processing" ? "var(--cyan)" : "rgba(255,255,255,0.08)",
      color: (done || status === "processing") ? "var(--bg)" : "var(--faint)",
      fontFamily: "var(--f-head)", fontWeight: 600, fontSize: "0.8rem",
    }}>
      {done
        ? <svg viewBox="0 0 24 24" fill="none" style={{ width: 13 }}><path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        : n}
    </div>
  );
}

/* ── main component ── */
export function Pipeline() {
  const { view, lang, toast } = useStudio();

  const [ps, setPs] = useState<PipelineState>({
    has_image: false, has_video: false, has_overlay: false, has_final: false, video_title: "",
  });
  const [prog, setProg] = useState<Progress | null>(null);

  /* form fields */
  const [videoSrc, setVideoSrc] = useState<"channel" | "url">("channel");
  const [videoUrl, setVideoUrl] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [keyword, setKeyword] = useState("سورة");
  const [caption, setCaption] = useState("");
  const [autoPost, setAutoPost] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /* cache-buster so preview <img> / <video> tags reload after each step */
  const [previewTs, setPreviewTs] = useState(() => Date.now());

  const ar = lang === "ar";

  /* ── helpers ── */
  const loadState = useCallback(async () => {
    try {
      const [sr, st] = await Promise.all([
        fetch("/api/pipeline/state"),
        fetch("/api/pipeline/settings"),
      ]);
      if (sr.ok) setPs(await sr.json());
      if (st.ok) {
        const d = await st.json();
        if (d.settings) {
          setChannelUrl(d.settings.default_channel_url || "");
          setKeyword(d.settings.default_keyword || "سورة");
          setCaption(d.settings.default_caption || "");
        }
      }
    } catch { /* backend offline — silently ignore */ }
  }, []);

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPoll = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch("/api/pipeline/progress");
        if (!r.ok) return;
        const d: Progress = await r.json();
        setProg(d);
        if (!d.active) {
          stopPoll();
          setPreviewTs(Date.now());
          loadState();
        }
      } catch { /* transient */ }
    }, 1000);
  }, [stopPoll, loadState]);

  /* json POST helper */
  const api = useCallback(async (path: string, body?: Record<string, unknown> | FormData) => {
    const opts: RequestInit = { method: "POST" };
    if (body instanceof FormData) {
      opts.body = body;
    } else if (body) {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
    const r = await fetch(`/api/pipeline/${path}`, opts);
    const d = await r.json();
    if (!d.success) throw new Error(d.message || "Request failed");
    return d;
  }, []);

  const runStep = useCallback(async (path: string, body?: Record<string, unknown> | FormData) => {
    try {
      startPoll();
      await api(path, body);
    } catch (e: unknown) {
      stopPoll();
      setPreviewTs(Date.now());
      loadState();
      toast(e instanceof Error ? e.message : "Error", "warn");
    }
  }, [api, startPoll, stopPoll, loadState, toast]);

  /* ── lifecycle ── */
  useEffect(() => {
    if (view === "pipeline") loadState();
  }, [view, loadState]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  /* ── derived ── */
  const isActive = !!prog?.active;
  const step = (k: string): StepStatus | undefined => prog?.steps?.[k]?.status;
  const ts = `?t=${previewTs}`;

  /* ── handlers ── */
  const handleUpload = (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    runStep("upload-image", fd);
  };

  const handleRunFull = () => {
    const body: Record<string, unknown> = { auto_post: autoPost, caption, keyword };
    if (videoSrc === "url") body.video_url = videoUrl;
    else body.channel_url = channelUrl;
    runStep("run-full-pipeline", body);
  };

  const handleStop = async () => {
    try { await api("stop-all"); } catch { /* ignore */ }
    stopPoll();
    setProg(null);
    loadState();
  };

  const handleReset = async () => {
    try { await api("reset"); } catch { /* ignore */ }
    loadState();
    setProg(null);
  };

  /* ── render ── */
  return (
    <section className={"view" + (view === "pipeline" ? " active" : "")} id="view-pipeline">

      {/* header */}
      <div className="view-head">
        <div>
          <h2>{ar ? "خط الإنتاج" : "Pipeline"}</h2>
          <div className="vh-sub">
            {ar
              ? "تنزيل الخلفية والفيديو القرآني، دمجهما، ونشرهما على إنستغرام"
              : "Download background + Quran video, composite, and post to Instagram"}
          </div>
        </div>
        {isActive && (
          <button className="btn btn-sm btn-ghost" onClick={handleStop} style={{ color: "#f56565", borderColor: "rgba(245,101,101,0.3)" }}>
            <svg viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
            {ar ? "إيقاف" : "Stop"}
          </button>
        )}
      </div>

      {/* progress rail */}
      <div className="card glass" style={{ marginBottom: 20, padding: "18px 24px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {NODE_KEYS.map((k, i) => {
            const st = step(k);
            const isNode = prog?.current_step === k && isActive;
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", flex: i < NODE_KEYS.length - 1 ? 1 : undefined }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: nodeColor(st),
                    border: isNode ? "2px solid var(--cyan)" : "2px solid transparent",
                    boxShadow: isNode ? "0 0 12px rgba(0,229,255,0.5)" : undefined,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.3s",
                  }}>
                    {(st === "completed" || st === "skipped") && (
                      <svg viewBox="0 0 24 24" fill="none" style={{ width: 14 }}>
                        <path d="M5 12l5 5L19 7" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {isNode && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--bg)" }} />
                    )}
                  </div>
                  <span style={{ fontSize: "0.65rem", color: "var(--faint)", whiteSpace: "nowrap" }}>
                    {ar
                      ? { image: "خلفية", video: "فيديو", overlay: "نص", final: "نهائي", post: "نشر" }[k]
                      : { image: "BG", video: "Video", overlay: "Overlay", final: "Final", post: "Post" }[k]}
                  </span>
                </div>
                {i < NODE_KEYS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: "0 6px", marginBottom: 20,
                    background: (st === "completed" || st === "skipped") ? "var(--gold)" : "rgba(255,255,255,0.08)",
                    transition: "background 0.4s",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {isActive && (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 3, borderRadius: 4, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                background: "linear-gradient(90deg, var(--cyan), var(--gold))",
                width: `${prog?.overall_percent ?? 0}%`,
                transition: "width 0.4s",
              }} />
            </div>
            <p style={{ color: "var(--faint)", fontSize: "0.75rem", marginTop: 6 }}>
              {prog?.overall_message}
            </p>
          </div>
        )}
      </div>

      {/* step cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px,1fr))", gap: 16, marginBottom: 16 }}>

        {/* step 1 — background */}
        <div className="card glass">
          <div className="card-head">
            <h3 style={{ fontSize: "0.95rem", gap: 10 }}>
              <StepNum n={1} status={step("image")} />
              {ar ? "صورة الخلفية" : "Background Image"}
            </h3>
            <StepPill status={step("image")} active={prog?.current_step === "image" && isActive} />
          </div>
          {ps.has_image && (
            <img
              src={`/api/pipeline/preview/image${ts}`}
              alt="background preview"
              style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 8, marginBottom: 12, opacity: 0.85 }}
            />
          )}
          <div className="stack" style={{ gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm btn-block"
              disabled={isActive}
              onClick={() => runStep("download-image", { query: "nature landscape" })}
            >
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z" stroke="currentColor" strokeWidth="1.7" /><path d="M3.6 9h16.8M3.6 15h16.8M12 3c-2.4 2.8-3.8 5.7-3.8 9s1.4 6.2 3.8 9M12 3c2.4 2.8 3.8 5.7 3.8 9s-1.4 6.2-3.8 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              {ar ? "جلب من Unsplash" : "Fetch from Unsplash"}
            </button>
            <label className="btn btn-ghost btn-sm btn-block" style={{ cursor: isActive ? "not-allowed" : "pointer", opacity: isActive ? 0.4 : 1 }}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {ar ? "رفع صورة" : "Upload image"}
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={isActive}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
            </label>
          </div>
        </div>

        {/* step 2 — quran video */}
        <div className="card glass">
          <div className="card-head">
            <h3 style={{ fontSize: "0.95rem", gap: 10 }}>
              <StepNum n={2} status={step("video")} />
              {ar ? "الفيديو القرآني" : "Quran Video"}
            </h3>
            <StepPill status={step("video")} active={prog?.current_step === "video" && isActive} />
          </div>
          {ps.video_title && (
            <p style={{ fontSize: "0.75rem", color: "var(--cyan)", marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {ps.video_title}
            </p>
          )}
          {/* source toggle */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {(["channel", "url"] as const).map((s) => (
              <button key={s} onClick={() => setVideoSrc(s)} style={{
                fontSize: "0.75rem", padding: "5px 14px", borderRadius: 20,
                border: `1px solid ${videoSrc === s ? "var(--cyan)" : "var(--hair)"}`,
                background: videoSrc === s ? "rgba(0,229,255,0.08)" : "transparent",
                color: videoSrc === s ? "var(--cyan)" : "var(--faint)", cursor: "pointer",
              }}>
                {s === "channel" ? (ar ? "قناة" : "Channel") : (ar ? "رابط مباشر" : "Direct URL")}
              </button>
            ))}
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {videoSrc === "channel" ? (
              <>
                <input className="field" placeholder={ar ? "رابط القناة على يوتيوب" : "YouTube channel URL"}
                  value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} style={{ fontSize: "0.83rem" }} />
                <input className="field" placeholder={ar ? "الكلمة المفتاحية" : "Keyword (e.g. سورة)"}
                  value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ fontSize: "0.83rem" }} />
              </>
            ) : (
              <input className="field" placeholder={ar ? "رابط الفيديو المباشر" : "Direct video URL"}
                value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} style={{ fontSize: "0.83rem" }} />
            )}
            <button className="btn btn-ghost btn-sm btn-block" disabled={isActive}
              onClick={() => runStep("download-video", videoSrc === "url"
                ? { video_url: videoUrl }
                : { channel_url: channelUrl, keyword })}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {ar ? "تنزيل الفيديو" : "Download video"}
            </button>
          </div>
        </div>

        {/* step 3 — text overlay */}
        <div className="card glass">
          <div className="card-head">
            <h3 style={{ fontSize: "0.95rem", gap: 10 }}>
              <StepNum n={3} status={step("overlay")} />
              {ar ? "استخراج النص" : "Text Overlay"}
            </h3>
            <StepPill status={step("overlay")} active={prog?.current_step === "overlay" && isActive} />
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--faint)", marginBottom: 14 }}>
            {ar ? "يستخرج النص العربي من الفيديو عبر فلتر colorkey في ffmpeg" : "Extracts Arabic text from the video using ffmpeg colorkey filter"}
          </p>
          <button className="btn btn-ghost btn-sm btn-block" disabled={isActive || !ps.has_video}
            onClick={() => runStep("extract-text")}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7 7-7 7M5 10h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 20h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            {ar ? "استخراج النص" : "Extract overlay"}
          </button>
        </div>

        {/* step 4 — final video */}
        <div className="card glass">
          <div className="card-head">
            <h3 style={{ fontSize: "0.95rem", gap: 10 }}>
              <StepNum n={4} status={step("final")} />
              {ar ? "الفيديو النهائي" : "Final Video"}
            </h3>
            <StepPill status={step("final")} active={prog?.current_step === "final" && isActive} />
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--faint)", marginBottom: 14 }}>
            {ar ? "دمج الخلفية + النص القرآني في فيديو 1080×1920" : "Composite background + Quran overlay → 1080×1920 reel"}
          </p>
          <div className="stack" style={{ gap: 8 }}>
            <button className="btn btn-ghost btn-sm btn-block" disabled={isActive || !ps.has_overlay}
              onClick={() => runStep("create-final-video")}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 10l5 2-5 2V10zM3 12h12M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {ar ? "إنشاء الفيديو النهائي" : "Compose final video"}
            </button>
            {ps.has_final && (
              <a href={`/api/pipeline/preview/final${ts}`} download="final_output.mp4"
                className="btn btn-cyan btn-sm btn-block" style={{ textDecoration: "none" }}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {ar ? "تنزيل الفيديو" : "Download video"}
              </a>
            )}
          </div>
        </div>

      </div>

      {/* post + run full */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px,1fr))", gap: 16, marginBottom: 24 }}>

        {/* step 5 — post */}
        <div className="card glass">
          <div className="card-head">
            <h3 style={{ fontSize: "0.95rem", gap: 10 }}>
              <StepNum n={5} status={step("post")} />
              {ar ? "النشر على إنستغرام" : "Post to Instagram"}
            </h3>
            <StepPill status={step("post")} active={prog?.current_step === "post" && isActive} />
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <textarea className="field" rows={3}
              placeholder={ar ? "التعليق على المنشور…" : "Caption…"}
              value={caption} onChange={(e) => setCaption(e.target.value)}
              style={{ resize: "vertical", fontSize: "0.83rem" }} />
            <button className="btn btn-ig btn-sm btn-block" disabled={isActive || !ps.has_final}
              onClick={() => runStep("post-to-instagram", { caption })}>
              <svg viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
              {ar ? "نشر على إنستغرام" : "Post to Instagram"}
            </button>
          </div>
        </div>

        {/* run full pipeline */}
        <div className="card glass">
          <div className="card-head" style={{ marginBottom: 8 }}>
            <h3 style={{ fontSize: "0.95rem" }}>{ar ? "تشغيل كامل" : "Run full pipeline"}</h3>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--faint)", marginBottom: 16 }}>
            {ar ? "تنفيذ جميع الخطوات دفعةً واحدة — تنزيل خلفية، فيديو، دمج، ونشر اختياري" : "Execute all steps automatically — background, video, composite, optional post"}
          </p>
          <div className="stack" style={{ gap: 10 }}>
            <label className="opt-row" style={{ padding: "8px 0", cursor: "pointer" }}>
              <div className="or-l">
                <span style={{ fontSize: "0.83rem" }}>{ar ? "نشر تلقائيًا على إنستغرام" : "Auto-post to Instagram"}</span>
              </div>
              <label className="switch">
                <input type="checkbox" checked={autoPost} onChange={(e) => setAutoPost(e.target.checked)} />
                <span className="track" />
                <span className="knob" />
              </label>
            </label>
            {isActive ? (
              <button className="btn btn-sm btn-block" onClick={handleStop}
                style={{ background: "rgba(245,101,101,0.12)", color: "#f56565", border: "1px solid rgba(245,101,101,0.25)" }}>
                <svg viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
                {ar ? "إيقاف التشغيل" : "Stop pipeline"}
              </button>
            ) : (
              <button className="btn btn-gold btn-sm btn-block" onClick={handleRunFull}>
                <svg viewBox="0 0 24 24" fill="none"><path d="m8 5 12 7-12 7V5z" fill="currentColor" /></svg>
                {ar ? "تشغيل الكل" : "Run full pipeline"}
              </button>
            )}
            <button className="btn-text" disabled={isActive} onClick={handleReset}
              style={{ alignSelf: "center", fontSize: "0.75rem" }}>
              {ar ? "إعادة تعيين خط الإنتاج" : "Reset pipeline"}
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
