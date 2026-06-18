"use client";

import { useStudio } from "@/contexts/StudioContext";

export function OverlaysCard() {
  const { S, toggleOption, t } = useStudio();

  const rows: { key: "trans" | "mark" | "head" | "frameTag"; label: string; sub: string }[] = [
    { key: "trans", label: t("optTrans"), sub: t("optTransSub") },
    { key: "mark", label: t("optMark"), sub: t("optMarkSub") },
    { key: "head", label: t("optHead"), sub: t("optHeadSub") },
    { key: "frameTag", label: t("optFrame"), sub: t("optFrameSub") },
  ];

  return (
    <section className="card glass">
      <div className="card-head">
        <h3>
          <span className="ic">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M5 7h14M5 12h9M5 17h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <span>{t("overlays")}</span>
        </h3>
      </div>

      {rows.map((r) => (
        <div className="opt-row" key={r.key}>
          <div className="or-l">
            <span>{r.label}</span>
            <span className="sub">{r.sub}</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={S[r.key]}
              onChange={(e) => toggleOption(r.key, e.target.checked)}
            />
            <span className="track" />
            <span className="knob" />
          </label>
        </div>
      ))}
    </section>
  );
}
