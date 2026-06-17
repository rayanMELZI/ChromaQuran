"use client";

import { useStudio } from "@/contexts/StudioContext";
import { PassageCard } from "./PassageCard";
import { ReciterCard } from "./ReciterCard";
import { Stage } from "./Stage";
import { StyleCard } from "./StyleCard";
import { OverlaysCard } from "./OverlaysCard";

export function Studio() {
  const { view, openExport, t } = useStudio();

  return (
    <section className={"view" + (view === "studio" ? " active" : "")} id="view-studio">
      <div className="studio-grid">
        {/* LEFT: passage + reciter */}
        <div className="col">
          <PassageCard />
          <ReciterCard />
        </div>

        {/* CENTER: preview stage */}
        <Stage />

        {/* RIGHT: style + overlays + render */}
        <div className="col">
          <StyleCard />
          <OverlaysCard />
          <button className="btn btn-green btn-block" onClick={openExport} style={{ padding: "14px" }}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 4v10m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 19h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <span>{t("renderBtn")}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
