"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type Ayah,
  surah as getSurah,
  loadSurahAyahs,
} from "@/lib/quran-data";
import { buildTimeline, type Timeline } from "@/lib/timeline";
import { clamp } from "@/lib/util";
import {
  type Lang,
  t as tRaw,
  msg as msgRaw,
  vWord as vWordRaw,
} from "@/lib/i18n";

/* ---------------- types ---------------- */
export interface StudioState {
  surah: number;
  from: number;
  to: number;
  reciter: string;
  font: string;
  size: number;
  color: string;
  trans: boolean;
  mark: boolean;
  head: boolean;
  frameTag: boolean;
}

export interface Defaults {
  reciter: string;
  font: string;
  color: string;
}

export interface Video {
  id: string;
  surah: number;
  from: number;
  to: number;
  reciter: string;
  font: string;
  color: string;
  dur: number;
  date: number;
  snippet: string;
  name: string;
  /** server download URL of the rendered MP4 (present for real exports) */
  url?: string;
}

export type ToastKind = "ok" | "info" | "warn" | "";
export interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

export type View = "studio" | "library" | "account";

interface StudioContextValue {
  /* language */
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  msg: (en: string, ar: string) => string;
  vWord: (n: number) => string;
  /* view */
  view: View;
  setView: (v: View) => void;
  /* studio state */
  S: StudioState;
  TL: Timeline;
  currentAyahs: Ayah[];
  loadingSurah: boolean;
  recitationTotal: number;
  setRecitationTotal: (n: number) => void;
  maxAyah: (n: number) => number;
  selectSurah: (n: number) => void;
  changeRange: (which: "from" | "to", delta: number) => void;
  setReciter: (id: string, silent?: boolean) => void;
  setFont: (id: string) => void;
  setColor: (id: string) => void;
  setSize: (v: number) => void;
  toggleOption: (key: "trans" | "mark" | "head" | "frameTag", value: boolean) => void;
  /* defaults */
  DEF: Defaults;
  saveDefaults: (patch: Partial<Defaults>) => void;
  /* library */
  library: Video[];
  addToLibrary: (v: Video) => void;
  deleteVideo: (id: string) => void;
  sendToAuto: (v: Video) => void;
  loadVideoIntoStudio: (id: string) => void;
  /* export modal */
  exportOpen: boolean;
  openExport: () => void;
  setExportOpen: (b: boolean) => void;
  /* toasts */
  toasts: ToastItem[];
  toast: (message: string, kind?: ToastKind) => void;
  removeToast: (id: number) => void;
  /* playback bridge: Stage registers its pause() so external actions can stop playback */
  pauseRef: React.MutableRefObject<(() => void) | null>;
}

const Ctx = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStudio must be used within StudioProvider");
  return v;
}

/* ---------------- helpers ---------------- */
function maxAyahOf(n: number): number {
  return getSurah(n).ayahs;
}

const DEFAULTS: Defaults = { reciter: "alafasy", font: "amiri", color: "warm" };

/* ---------------- provider ---------------- */
export function StudioProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [view, setViewState] = useState<View>("studio");
  const [DEF, setDEF] = useState<Defaults>(DEFAULTS);
  const [S, setS] = useState<StudioState>({
    surah: 1,
    from: 1,
    to: 7,
    reciter: "alafasy",
    font: "amiri",
    size: 8.4,
    color: "warm",
    trans: false,
    mark: true,
    head: true,
    frameTag: false,
  });
  const [library, setLibrary] = useState<Video[]>([]);
  const [currentAyahs, setCurrentAyahs] = useState<Ayah[]>([]);
  const [loadingSurah, setLoadingSurah] = useState(true);
  const [recitationTotal, setRecitationTotal] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);
  const pauseRef = useRef<(() => void) | null>(null);
  const booted = useRef(false);

  /* bound i18n helpers */
  const t = useCallback((key: string) => tRaw(key, lang), [lang]);
  const msg = useCallback((en: string, ar: string) => msgRaw(en, ar, lang), [lang]);
  const vWord = useCallback((n: number) => vWordRaw(n, lang), [lang]);

  /* derived timeline (built from the loaded surah text) */
  const TL = useMemo(
    () => buildTimeline(currentAyahs, S.from, S.to, S.reciter),
    [currentAyahs, S.from, S.to, S.reciter]
  );

  /* load the selected surah's verse text on demand (loadSurahAyahs caches per surah) */
  useEffect(() => {
    let cancelled = false;
    setLoadingSurah(true);
    loadSurahAyahs(S.surah)
      .then((ayahs) => {
        if (!cancelled) {
          setCurrentAyahs(ayahs);
          setLoadingSurah(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentAyahs([]);
          setLoadingSurah(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [S.surah]);

  /* ---------------- toasts ---------------- */
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);
  const toast = useCallback((message: string, kind: ToastKind = "") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, kind }]);
  }, []);

  /* ---------------- boot: load this user's settings (per-user, DB-backed) ---------------- */
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    let cancelled = false;
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const s = (data && data.settings) || {};
        const def: Defaults = {
          reciter: s.reciter || DEFAULTS.reciter,
          font: s.font || DEFAULTS.font,
          color: s.color || DEFAULTS.color,
        };
        const lng: Lang = s.lang === "ar" ? "ar" : "en";
        setLangState(lng);
        setDEF(def);
        setS((prev) => ({ ...prev, reciter: def.reciter, font: def.font, color: def.color }));
        toast(
          msgRaw("Studio ready — Al-Fatihah loaded", "الاستوديو جاهز — حُمّلت الفاتحة", lng),
          "ok"
        );
      })
      .catch(() => {
        if (!cancelled) toast(msgRaw("Studio ready — Al-Fatihah loaded", "", "en"), "ok");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* load this user's library from the server (per-user, DB-backed) */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/library")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.videos)) setLibrary(data.videos);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* reflect lang on <html> */
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  /* ---------------- language (persisted per-user) ---------------- */
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: l }),
    }).catch(() => {});
  }, []);

  /* ---------------- view ---------------- */
  const setView = useCallback((v: View) => {
    setViewState(v);
    if (v !== "studio") pauseRef.current?.();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ---------------- studio actions ---------------- */
  const selectSurah = useCallback((n: number) => {
    pauseRef.current?.();
    const to = Math.min(maxAyahOf(n), 7); // sensible default range; user can extend
    setS((prev) => ({ ...prev, surah: n, from: 1, to }));
  }, []);

  const changeRange = useCallback((which: "from" | "to", delta: number) => {
    pauseRef.current?.();
    setS((prev) => {
      const mx = maxAyahOf(prev.surah);
      if (which === "from") {
        return { ...prev, from: clamp(prev.from + delta, 1, prev.to) };
      }
      return { ...prev, to: clamp(prev.to + delta, prev.from, mx) };
    });
  }, []);

  const setReciter = useCallback(
    (id: string, silent = false) => {
      pauseRef.current?.();
      setS((prev) => ({ ...prev, reciter: id }));
      if (!silent) toast(msg("Reciter: ", "القارئ: ") + getReciterEn(id), "info");
    },
    [toast, msg]
  );

  const setFont = useCallback((id: string) => setS((p) => ({ ...p, font: id })), []);
  const setColor = useCallback((id: string) => setS((p) => ({ ...p, color: id })), []);
  const setSize = useCallback((v: number) => setS((p) => ({ ...p, size: v })), []);
  const toggleOption = useCallback(
    (key: "trans" | "mark" | "head" | "frameTag", value: boolean) =>
      setS((p) => ({ ...p, [key]: value })),
    []
  );

  /* ---------------- defaults (persisted per-user) ---------------- */
  const saveDefaults = useCallback((patch: Partial<Defaults>) => {
    setDEF((prev) => ({ ...prev, ...patch }));
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }, []);

  /* ---------------- library (per-user, DB-backed via /api/library) ---------------- */
  const addToLibrary = useCallback(
    (v: Video) => {
      /* Persist server-side; the DB assigns the real id/date. Show the client's
       * optimistic row immediately, then reconcile with the saved row. */
      setLibrary((prev) => [v, ...prev]);
      fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.video) {
            setLibrary((prev) => prev.map((x) => (x.id === v.id ? data.video : x)));
          }
        })
        .catch(() => {});
    },
    []
  );
  const deleteVideo = useCallback(
    (id: string) => {
      setLibrary((prev) => prev.filter((x) => x.id !== id));
      fetch(`/api/library/${id}`, { method: "DELETE" }).catch(() => {});
      toast(msg("Removed from library", "حُذف من المكتبة"), "warn");
    },
    [toast, msg]
  );
  const sendToAuto = useCallback(
    (v: Video) => {
      try {
        localStorage.setItem("cq_handoff", JSON.stringify(v));
      } catch {}
      toast(msg("Sent to Auto Quran", "أُرسل إلى أوتو قرآن"), "ok");
    },
    [toast, msg]
  );
  const loadVideoIntoStudio = useCallback(
    (id: string) => {
      setLibrary((prevLib) => {
        const v = prevLib.find((x) => x.id === id);
        if (v) {
          pauseRef.current?.();
          setS((prev) => ({
            ...prev,
            surah: v.surah,
            from: v.from,
            to: v.to,
            reciter: v.reciter,
            font: v.font,
            color: v.color,
          }));
          setViewState("studio");
          if (typeof window !== "undefined")
            window.scrollTo({ top: 0, behavior: "smooth" });
          toast(msg("Loaded into the Studio", "تم التحميل في الاستوديو"), "info");
        }
        return prevLib;
      });
    },
    [toast, msg]
  );

  /* ---------------- export ---------------- */
  const openExport = useCallback(() => setExportOpen(true), []);

  const value: StudioContextValue = {
    lang,
    setLang,
    t,
    msg,
    vWord,
    view,
    setView,
    S,
    TL,
    currentAyahs,
    loadingSurah,
    recitationTotal,
    setRecitationTotal,
    maxAyah: maxAyahOf,
    selectSurah,
    changeRange,
    setReciter,
    setFont,
    setColor,
    setSize,
    toggleOption,
    DEF,
    saveDefaults,
    library,
    addToLibrary,
    deleteVideo,
    sendToAuto,
    loadVideoIntoStudio,
    exportOpen,
    openExport,
    setExportOpen,
    toasts,
    toast,
    removeToast,
    pauseRef,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* English reciter name without importing the full helper into the closure repeatedly */
function getReciterEn(id: string): string {
  const map: Record<string, string> = {
    alafasy: "Mishary Rashid Alafasy",
    abdulbasit: "Abdul Basit Abdul Samad",
    muaiqly: "Maher Al-Muaiqly",
    minshawi: "Mohamed Al-Minshawi",
    husary: "Mahmoud Al-Husary",
    sudais: "Abdul Rahman Al-Sudais",
    ghamdi: "Saad Al-Ghamdi",
  };
  return map[id] || id;
}
