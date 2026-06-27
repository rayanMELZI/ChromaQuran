"use client";

import { useStudio } from "@/contexts/StudioContext";
import { Background } from "./Background";
import { AppBar } from "./AppBar";
import { Studio } from "./Studio";
import { Library } from "./Library";
import { Automation } from "./Automation";
import { Account } from "./Account";
import { Pipeline } from "./Pipeline";
import { ExportModal } from "./ExportModal";
import { Toaster } from "./Toaster";

export function AppShell() {
  const { t } = useStudio();
  return (
    <>
      <Background />
      <div className="app">
        <AppBar />
        <Studio />
        <Library />
        <Automation />
        <Account />
        <Pipeline />
        <div className="footnote">
          {t("footnote")}
          {" · "}
          <a href="/about" style={{ color: "var(--faint)", textDecoration: "underline" }}>
            {t("credits")}
          </a>
        </div>
      </div>
      <ExportModal />
      <Toaster />
    </>
  );
}
