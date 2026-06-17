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
  toggleOption: (key: "trans" | "mark" | "head", value: boolean) => void;
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

  /* ---------------- boot: hydrate from localStorage (client only) ---------------- */
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    let storedLang: Lang = "en";
    try {
      const l = localStorage.getItem("cq_lang");
      if (l === "en" || l === "ar") storedLang = l;
    } catch {}
    setLangState(storedLang);

    let def = DEFAULTS;
    try {
      const d = JSON.parse(localStorage.getItem("cq_defaults") || "null");
      if (d) def = { ...DEFAULTS, ...d };
    } catch {}
    setDEF(def);
    setS((prev) => ({
      ...prev,
      reciter: def.reciter || prev.reciter,
      font: def.font || prev.font,
      color: def.color || prev.color,
    }));

    let lib: Video[] | null = null;
    try {
      lib = JSON.parse(localStorage.getItem("cq_library") || "null");
    } catch {
      lib = null;
    }
    if (!lib) {
      lib = seedLibrary();
      try {
        localStorage.setItem("cq_library", JSON.stringify(lib));
      } catch {}
    }
    setLibrary(lib);

    toast(
      msgRaw("Studio ready — Al-Fatihah loaded", "الاستوديو جاهز — حُمّلت الفاتحة", storedLang),
      "ok"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* reflect lang on <html> */
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  /* ---------------- language ---------------- */
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("cq_lang", l);
    } catch {}
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
    (key: "trans" | "mark" | "head", value: boolean) =>
      setS((p) => ({ ...p, [key]: value })),
    []
  );

  /* ---------------- defaults ---------------- */
  const saveDefaults = useCallback((patch: Partial<Defaults>) => {
    setDEF((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem("cq_defaults", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  /* ---------------- library ---------------- */
  const persistLib = useCallback((lib: Video[]) => {
    try {
      localStorage.setItem("cq_library", JSON.stringify(lib));
    } catch {}
  }, []);
  const addToLibrary = useCallback(
    (v: Video) => {
      setLibrary((prev) => {
        const next = [v, ...prev];
        persistLib(next);
        return next;
      });
    },
    [persistLib]
  );
  const deleteVideo = useCallback(
    (id: string) => {
      setLibrary((prev) => {
        const next = prev.filter((x) => x.id !== id);
        persistLib(next);
        return next;
      });
      toast(msg("Removed from library", "حُذف من المكتبة"), "warn");
    },
    [persistLib, toast, msg]
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

/* ---------------- seed library (4 sample reels on first run) ---------------- */
function seedLibrary(): Video[] {
  const now = Date.now();
  const day = 86400000;
  function mk(
    n: number,
    from: number,
    to: number,
    rec: string,
    font: string,
    color: string,
    dur: number,
    snippet: string,
    ago: number
  ): Video {
    return {
      id: "seed" + n + from,
      surah: n,
      from,
      to,
      reciter: rec,
      font,
      color,
      dur,
      date: now - ago * day,
      snippet,
      name: "chromaquran-" + getSurah(n).tr.toLowerCase().replace(/[^a-z]/g, "") + "-" + from + "-" + to + ".mp4",
    };
  }
  return [
    mk(112, 1, 4, "alafasy", "amiri", "warm", 13, "قُلْ هُوَ ٱللَّهُ أَحَدٌ", 1),
    mk(103, 1, 3, "abdulbasit", "scheherazade", "gold", 18, "وَٱلْعَصْرِ", 3),
    mk(55, 1, 8, "muaiqly", "kufi", "cyan", 27, "ٱلرَّحْمَٰنُ", 6),
    mk(114, 1, 6, "ghamdi", "noto", "warm", 22, "قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ", 9),
  ];
}
