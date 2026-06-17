"use client";

import { useStudio, type View } from "@/contexts/StudioContext";
import { Emblem } from "./Emblem";

const NAV: { view: View; key: string; icon: React.ReactNode }[] = [
  {
    view: "studio",
    key: "navStudio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="m10 9 5 3-5 3z" fill="currentColor" />
      </svg>
    ),
  },
  {
    view: "library",
    key: "navLibrary",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="7" height="16" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13" y="4" width="8" height="16" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    view: "account",
    key: "navAccount",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8.5" r="3.6" stroke="currentColor" strokeWidth="1.7" />
        <path d="M5 20c.6-3.6 3.4-6 7-6s6.4 2.4 7 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AppBar() {
  const { view, setView, lang, setLang, t, msg, toast } = useStudio();

  return (
    <header className="appbar">
      <div className="appbar-inner glass">
        <div className="brand">
          <span className="mark">
            <Emblem />
          </span>
          <div>
            <div className="t1">
              Chroma <b>Quran</b>
            </div>
            <div className="t2">{t("brandSub")}</div>
          </div>
        </div>

        <div className="viewswitch">
          {NAV.map((n) => (
            <button
              key={n.view}
              className={view === n.view ? "active" : undefined}
              onClick={() => setView(n.view)}
            >
              {n.icon}
              <span>{t(n.key)}</span>
            </button>
          ))}
        </div>

        <div className="appbar-actions">
          <a
            className="link-out"
            href="#"
            title="Auto Quran"
            onClick={(e) => {
              e.preventDefault();
              toast(msg("Auto Quran — the sibling posting tool", "أوتو قرآن — أداة النشر الشقيقة"), "info");
            }}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 12a8 8 0 0 1 13.7-5.6M20 12A8 8 0 0 1 6.3 17.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M18 3v3.4h-3.4M6 21v-3.4h3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{t("openAuto")}</span>
          </a>
          <button className="lang-btn" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
            {lang === "en" ? "العربية" : "English"}
          </button>
        </div>
      </div>
    </header>
  );
}
