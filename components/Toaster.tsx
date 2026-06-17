"use client";

import { useEffect, useState } from "react";
import { useStudio, type ToastItem, type ToastKind } from "@/contexts/StudioContext";

function ToastIcon({ kind }: { kind: ToastKind }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      {kind === "ok" ? (
        <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : kind === "info" ? (
        <>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 11v5m0-8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : kind === "warn" ? (
        <>
          <path d="M12 4 2 20h20z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M12 10v4m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 8v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function ToastView({ item, onDone }: { item: ToastItem; onDone: (id: number) => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const t1 = setTimeout(() => setShown(false), 2600);
    const t2 = setTimeout(() => onDone(item.id), 2600 + 320);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [item.id, onDone]);

  return (
    <div className={"toast " + item.kind + (shown ? " in" : "")}>
      <span className="tic">
        <ToastIcon kind={item.kind} />
      </span>
      <span>{item.message}</span>
    </div>
  );
}

export function Toaster() {
  const { toasts, removeToast } = useStudio();
  return (
    <div className="toasts">
      {toasts.map((item) => (
        <ToastView key={item.id} item={item} onDone={removeToast} />
      ))}
    </div>
  );
}
