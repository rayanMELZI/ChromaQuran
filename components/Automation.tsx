"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { RECITERS, FONTS, COLORS } from "@/lib/quran-data";
import { clamp } from "@/lib/util";

interface AutomationData {
  enabled: boolean;
  runHour: number;
  runMinute: number;
  reciter: string;
  ayahsPerDay: number;
  frameTag: boolean;
  font: string;
  color: string;
  cursorSurah: number;
  cursorAyah: number;
  lastRunDate: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
  postsCount: number;
  progress: { done: number; total: number };
  nextUp: { surah: number; surahAr: string; surahTr: string; from: number; to: number };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function Automation() {
  const { view, msg, t, toast } = useStudio();
  const [data, setData] = useState<AutomationData | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(() => {
    fetch("/api/automation")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.automation) setData(d.automation);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (view === "automation") load();
  }, [view, load]);

  const patch = async (body: Record<string, unknown>, okMsg?: string) => {
    setSaving(true);
    try {
      const r = await fetch("/api/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.ok && d.automation) {
        setData(d.automation);
        if (okMsg) toast(okMsg, "ok");
      } else {
        toast(msg("Could not save", "تعذّر الحفظ"), "warn");
      }
    } catch {
      toast(msg("Could not save", "تعذّر الحفظ"), "warn");
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    if (running) return;
    setRunning(true);
    toast(msg("Rendering & posting the next batch… this takes a minute", "جارٍ المعالجة والنشر… قد يستغرق دقيقة"), "info");
    try {
      const r = await fetch("/api/automation/run", { method: "POST" });
      const d = await r.json();
      if (r.ok && d.ok) toast(msg("Posted to Instagram — ", "نُشر على إنستغرام — ") + (d.message || ""), "ok");
      else toast(msg("Run failed", "فشل التشغيل") + (d.message ? " — " + String(d.message).slice(0, 120) : ""), "warn");
    } catch {
      toast(msg("Run failed", "فشل التشغيل"), "warn");
    } finally {
      setRunning(false);
      load();
    }
  };

  const a = data;
  const pct = a ? clamp(Math.round((a.progress.done / a.progress.total) * 100), 0, 100) : 0;
  const barStyle = { width: clamp(pct, 1, 100) + "%" } as CSSProperties;

  return (
    <section className={"view" + (view === "automation" ? " active" : "")} id="view-automation">
      <div className="view-head">
        <div>
          <h2>{t("navAutomation")}</h2>
          <div className="vh-sub">
            {msg(
              "Auto-render and post through the whole Quran, on a daily schedule",
              "معالجة ونشر تلقائي للقرآن كاملًا، وفق جدول يومي"
            )}
          </div>
        </div>
      </div>

      {!a ? (
        <div className="lib-empty glass">
          <h3>{msg("Loading…", "جارٍ التحميل…")}</h3>
        </div>
      ) : (
        <div className="acct-grid">
          <div className="col">
            {/* Enable + status */}
            <section className="card glass">
              <div className="opt-row">
                <div className="or-l">
                  <span>{msg("Daily auto-posting", "النشر التلقائي اليومي")}</span>
                  <span className="sub">
                    {a.enabled
                      ? msg("On — runs every day", "مُفعّل — يعمل كل يوم") + ` · ${pad(a.runHour)}:${pad(a.runMinute)}`
                      : msg("Off", "مُعطّل")}
                  </span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={a.enabled}
                    onChange={(e) =>
                      patch(
                        { enabled: e.target.checked },
                        e.target.checked
                          ? msg("Automation enabled", "تم تفعيل الأتمتة")
                          : msg("Automation paused", "تم إيقاف الأتمتة")
                      )
                    }
                  />
                  <span className="track" />
                  <span className="knob" />
                </label>
              </div>

              <div className="divider" style={{ margin: "14px 0" }} />

              <div className="pref-row">
                <div className="pr-l">
                  <span>{msg("Run time (server)", "وقت التشغيل (الخادم)")}</span>
                  <span className="sub">{msg("Each day at this time", "كل يوم في هذا الوقت")}</span>
                </div>
                <input
                  className="field"
                  type="time"
                  value={`${pad(a.runHour)}:${pad(a.runMinute)}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number);
                    if (Number.isInteger(h) && Number.isInteger(m))
                      patch({ runHour: h, runMinute: m }, msg("Schedule saved", "تم حفظ الجدول"));
                  }}
                />
              </div>

              <div className="pref-row">
                <div className="pr-l">
                  <span>{msg("Ayahs per day", "آيات في اليوم")}</span>
                </div>
                <input
                  className="field"
                  type="number"
                  min={1}
                  max={10}
                  value={a.ayahsPerDay}
                  onChange={(e) => {
                    const v = clamp(parseInt(e.target.value, 10) || 7, 1, 10);
                    patch({ ayahsPerDay: v }, msg("Saved", "تم الحفظ"));
                  }}
                />
              </div>

              <div className="opt-row">
                <div className="or-l">
                  <span>{t("optFrame")}</span>
                  <span className="sub">{t("optFrameSub")}</span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={a.frameTag}
                    onChange={(e) => patch({ frameTag: e.target.checked }, msg("Saved", "تم الحفظ"))}
                  />
                  <span className="track" />
                  <span className="knob" />
                </label>
              </div>
            </section>

            {/* Style */}
            <section className="card glass">
              <div className="card-head">
                <h3>
                  <span className="ic">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M5 7h14M5 12h9M5 17h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span>{t("style")}</span>
                </h3>
              </div>
              <div className="pref-row">
                <div className="pr-l">
                  <span>{t("reciter")}</span>
                </div>
                <select className="field" value={a.reciter} onChange={(e) => patch({ reciter: e.target.value }, msg("Saved", "تم الحفظ"))}>
                  {RECITERS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pref-row">
                <div className="pr-l">
                  <span>{t("fontLabel")}</span>
                </div>
                <select className="field" value={a.font} onChange={(e) => patch({ font: e.target.value }, msg("Saved", "تم الحفظ"))}>
                  {FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pref-row">
                <div className="pr-l">
                  <span>{t("colorLabel")}</span>
                </div>
                <select className="field" value={a.color} onChange={(e) => patch({ color: e.target.value }, msg("Saved", "تم الحفظ"))}>
                  {COLORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          </div>

          <div className="col">
            {/* Progress */}
            <section className="card glass">
              <div className="card-head">
                <h3>
                  <span className="ic gold">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M4 12a8 8 0 1 1 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M4 17v-5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>{msg("Progress through the Quran", "التقدّم في القرآن")}</span>
                </h3>
              </div>

              <div className="next-up glass" style={{ padding: "12px 14px", borderRadius: 12, marginBottom: 14 }}>
                <div className="section-label" style={{ marginBottom: 6 }}>{msg("Next up", "التالي")}</div>
                <div style={{ fontSize: 16, fontFamily: "'El Messiri'", color: "var(--gold-soft)" }}>
                  {a.nextUp.surahAr} · {a.nextUp.surahTr}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {msg("Verses ", "الآيات ")}
                  {a.nextUp.from}–{a.nextUp.to}
                </div>
              </div>

              <div className="row between" style={{ fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>
                  <b style={{ fontFamily: "'El Messiri'", color: "var(--gold-soft)" }}>{a.progress.done}</b>
                  {" / "}
                  {a.progress.total} {msg("ayahs", "آية")}
                </span>
                <span className="hint-r">{pct}%</span>
              </div>
              <div className="usage-bar">
                <div className="uf" style={barStyle} />
              </div>

              <div className="row between" style={{ fontSize: 13, marginTop: 14 }}>
                <span style={{ color: "var(--muted)" }}>{msg("Posts made", "المنشورات")}</span>
                <span className="hint-r">{a.postsCount}</span>
              </div>
              {a.lastStatus ? (
                <div className="row between" style={{ fontSize: 13, marginTop: 8 }}>
                  <span style={{ color: "var(--muted)" }}>{msg("Last run", "آخر تشغيل")}</span>
                  <span
                    className="hint-r"
                    style={{ color: a.lastStatus === "ok" ? "var(--green, #8fd9a8)" : "#f0a3a3" }}
                  >
                    {a.lastStatus === "ok" ? msg("OK", "تم") : msg("Failed", "فشل")}
                    {a.lastRunDate ? ` · ${a.lastRunDate}` : ""}
                  </span>
                </div>
              ) : null}
              {a.lastMessage ? (
                <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 6 }}>{a.lastMessage}</div>
              ) : null}
            </section>

            {/* Run now */}
            <section className="card glass">
              <div className="crosslink">
                <span className="cl-ic">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M8 5v14l11-7z" fill="currentColor" />
                  </svg>
                </span>
                <div className="cl-main">
                  <div className="cl-h">{msg("Run the next batch now", "شغّل الدفعة التالية الآن")}</div>
                  <div className="cl-s">{msg("Render & post immediately — also advances the cursor", "معالجة ونشر فورًا — ويتقدّم المؤشّر")}</div>
                </div>
                <button className="btn btn-gold btn-sm" onClick={runNow} disabled={running || saving}>
                  <span>{running ? msg("Working…", "جارٍ…") : msg("Run now", "شغّل الآن")}</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
