"use client";

import { useEffect } from "react";
import type { Ayah } from "@/lib/quran-data";
import { Composition, FrameTag } from "./Composition";

/** Full-bleed 1080×1920 composition for the render worker to screenshot.
 * Sets data-render-ready="1" on <html> once fonts are loaded + painted, so
 * Playwright waits for the verse to be fully typeset before capturing. */
export function RenderFrame(props: {
  surahName: string;
  ayah: Ayah | undefined;
  fontFamily: string;
  colorValue: string;
  size: number;
  trans: boolean;
  mark: boolean;
  head: boolean;
  frameTag: boolean;
}) {
  useEffect(() => {
    let done = false;
    const markReady = () => {
      if (done) return;
      done = true;
      document.documentElement.setAttribute("data-render-ready", "1");
    };
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    const ready = fonts?.ready ?? Promise.resolve();
    ready.then(() => requestAnimationFrame(() => requestAnimationFrame(markReady)));
    const t = setTimeout(markReady, 5000); // safety net
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="render-stage">
      {props.frameTag ? <FrameTag /> : null}
      <Composition
        surahName={props.surahName}
        ayah={props.ayah}
        fontFamily={props.fontFamily}
        colorValue={props.colorValue}
        size={props.size}
        trans={props.trans}
        mark={props.mark}
        head={props.head}
      />
    </div>
  );
}
