"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { RECITERS, FONTS, COLORS } from "@/lib/quran-data";
import { clamp } from "@/lib/util";
import { Emblem } from "./Emblem";
import type { Lang } from "@/lib/i18n";

function IgGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

export function Account() {
  const { view, lang, setLang, DEF, saveDefaults, setReciter, setFont, setColor, library, msg, toast, t } =
    useStudio();

  const gb = library.length * 0.038;
  const usageStyle = { width: clamp((gb / 5) * 100, 2, 100) + "%" } as CSSProperties;

  const onSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  };

  const [me, setMe] = useState<{ name: string; email: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.user) setMe(d.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={"view" + (view === "account" ? " active" : "")} id="view-account">
      <div className="view-head">
        <div>
          <h2>{t("acctTitle")}</h2>
          <div className="vh-sub">{t("acctSub")}</div>
        </div>
      </div>

      <div className="acct-grid">
        <div className="col">
          <section className="card glass">
            <div className="acct-id">
              <span className="ava">
                <Emblem />
              </span>
              <div>
                <div className="ai-name">{me ? me.name : "…"}</div>
                <div className="ai-mail">{me ? me.email : ""}</div>
                <span className="ai-plan">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="m12 3 2.5 5.5L20 9l-4 4 1 6-5-2.8L7 19l1-6-4-4 5.5-.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                  <span>{t("planLabel")}</span>
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginInlineStart: "auto" }} onClick={onSignOut}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{t("signOut")}</span>
              </button>
            </div>
            <div className="divider" style={{ margin: "18px 0 16px" }} />
            <div className="section-label" style={{ marginBottom: "12px" }}>
              {t("linkedPages")}
            </div>
            <div className="linked">
              <span className="li-av">
                <IgGlyph />
              </span>
              <div className="li-main">
                <div className="li-h">@wisdomfrom.quran</div>
                <div className="li-s">{t("igChannel1")}</div>
              </div>
              <span className="li-status">
                <span className="d" />
                <span>{t("connected")}</span>
              </span>
            </div>
            <div className="linked">
              <span className="li-av">
                <IgGlyph />
              </span>
              <div className="li-main">
                <div className="li-h">@wisdom.quran.ar</div>
                <div className="li-s">{t("igChannel2")}</div>
              </div>
              <span className="li-status">
                <span className="d" />
                <span>{t("connected")}</span>
              </span>
            </div>
          </section>

          <section className="card glass">
            <div className="crosslink">
              <span className="cl-ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12a8 8 0 0 1 13.7-5.6M20 12A8 8 0 0 1 6.3 17.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  <path d="M18 3v3.4h-3.4M6 21v-3.4h3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="cl-main">
                <div className="cl-h">{t("crossH")}</div>
                <div className="cl-s">{t("crossS")}</div>
              </div>
              <a
                className="btn btn-ghost btn-sm"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast(msg("Auto Quran — the sibling posting tool", "أوتو قرآن — أداة النشر الشقيقة"), "info");
                }}
              >
                <span>{t("crossOpen")}</span>
              </a>
            </div>
          </section>
        </div>

        <div className="col">
          <section className="card glass">
            <div className="card-head">
              <h3>
                <span className="ic gold">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path d="M5 19 19 5M9 5H5v4M19 15v4h-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>{t("defaults")}</span>
              </h3>
            </div>

            <div className="pref-row">
              <div className="pr-l">
                <span>{t("prefLang")}</span>
                <span className="sub">{t("prefLangSub")}</span>
              </div>
              <select className="field" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            <div className="pref-row">
              <div className="pr-l">
                <span>{t("prefReciter")}</span>
              </div>
              <select
                className="field"
                value={DEF.reciter}
                onChange={(e) => {
                  saveDefaults({ reciter: e.target.value });
                  setReciter(e.target.value, true);
                  toast(msg("Default reciter saved", "حُفظ القارئ الافتراضي"), "ok");
                }}
              >
                {RECITERS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.en}
                  </option>
                ))}
              </select>
            </div>

            <div className="pref-row">
              <div className="pr-l">
                <span>{t("prefFont")}</span>
              </div>
              <select
                className="field"
                value={DEF.font}
                onChange={(e) => {
                  saveDefaults({ font: e.target.value });
                  setFont(e.target.value);
                  toast(msg("Default typeface saved", "حُفظ الخط الافتراضي"), "ok");
                }}
              >
                {FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pref-row">
              <div className="pr-l">
                <span>{t("prefColor")}</span>
              </div>
              <select
                className="field"
                value={DEF.color}
                onChange={(e) => {
                  saveDefaults({ color: e.target.value });
                  setColor(e.target.value);
                  toast(msg("Default color saved", "حُفظ اللون الافتراضي"), "ok");
                }}
              >
                {COLORS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="card glass">
            <div className="card-head">
              <h3>
                <span className="ic">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <ellipse cx="12" cy="6" rx="8" ry="3" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </span>
                <span>{t("storage")}</span>
              </h3>
            </div>
            <div className="row between" style={{ fontSize: "13px" }}>
              <span style={{ color: "var(--muted)" }}>
                <b style={{ fontFamily: "'El Messiri'", color: "var(--gold-soft)" }}>{gb.toFixed(2)} GB</b>{" "}
                {t("ofStorage")}
              </span>
              <span className="hint-r">
                {library.length} {msg("videos", "فيديو")}
              </span>
            </div>
            <div className="usage-bar">
              <div className="uf" style={usageStyle} />
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
