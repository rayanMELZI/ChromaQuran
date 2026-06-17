"use client";

import { useStudio } from "@/contexts/StudioContext";
import { RECITERS } from "@/lib/quran-data";

export function ReciterCard() {
  const { S, setReciter, t } = useStudio();

  return (
    <section className="card glass">
      <div className="card-head">
        <h3>
          <span className="ic">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M3 14v-4M7 17V7M11 20V4M15 17V7M19 14v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <span>{t("reciter")}</span>
        </h3>
        <span className="hint-r">{t("reciterHint")}</span>
      </div>

      <div className="reciter-list">
        {RECITERS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={"reciter" + (r.id === S.reciter ? " sel" : "")}
            onClick={() => setReciter(r.id)}
          >
            <span className="r-av">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 14a3.5 3.5 0 0 0 3.5-3.5V7a3.5 3.5 0 0 0-7 0v3.5A3.5 3.5 0 0 0 12 14z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6 11a6 6 0 0 0 12 0M12 17v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="r-main">
              <span className="r-ar">{r.ar}</span>
              <span className="r-style">
                {r.en} · {r.style}
              </span>
            </span>
            <span className="r-check">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
