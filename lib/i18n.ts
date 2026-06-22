/* ChromaQuran — i18n (UI chrome only; verse text is always Arabic).
 * AR/EN toggle swaps copy only — layout direction never flips.
 */

export type Lang = "en" | "ar";

export interface I18nEntry {
  en: string;
  ar: string;
}

export const I18N: Record<string, I18nEntry> = {
  brandSub: { en: "Black-canvas Quran video studio", ar: "استوديو فيديوهات القرآن بخلفية سوداء" },
  navStudio: { en: "Studio", ar: "الاستوديو" },
  navLibrary: { en: "Library", ar: "المكتبة" },
  navAutomation: { en: "Automation", ar: "الأتمتة" },
  navAccount: { en: "Account", ar: "الحساب" },
  openAuto: { en: "Auto Quran", ar: "أوتو قرآن" },
  passage: { en: "Passage", ar: "المقطع" },
  passageHint: { en: "Surah & verses", ar: "السورة والآيات" },
  surahLabel: { en: "Surah", ar: "السورة" },
  searchSurah: { en: "Search surah…", ar: "ابحث عن سورة…" },
  fromAyah: { en: "From verse", ar: "من آية" },
  toAyah: { en: "To verse", ar: "إلى آية" },
  reciter: { en: "Reciter", ar: "القارئ" },
  reciterHint: { en: "Drives timing", ar: "يضبط التوقيت" },
  style: { en: "Style", ar: "التنسيق" },
  styleHint: { en: "Typeface & canvas", ar: "الخط واللوحة" },
  fontLabel: { en: "Quran typeface", ar: "خط المصحف" },
  sizeLabel: { en: "Verse size", ar: "حجم الآية" },
  colorLabel: { en: "Text color", ar: "لون النص" },
  overlays: { en: "Overlays", ar: "العناصر" },
  optTrans: { en: "Translation line", ar: "سطر الترجمة" },
  optTransSub: { en: "English meaning beneath the verse", ar: "المعنى بالإنجليزية تحت الآية" },
  optMark: { en: "Verse-number marker", ar: "رقم الآية" },
  optMarkSub: { en: "۝ ayah ornament after each verse", ar: "زخرفة ۝ بعد كل آية" },
  optHead: { en: "Surah name header", ar: "اسم السورة في الأعلى" },
  optHeadSub: { en: "name & emblem at the top", ar: "الاسم والشعار في الأعلى" },
  optFrame: { en: "Recording tag", ar: "شارة التسجيل" },
  optFrameSub: { en: "1080×1920 · 9:16 marker, top-left corner", ar: "علامة 1080×1920 · 9:16 في الزاوية" },
  renderBtn: { en: "Render & Export Video", ar: "معالجة وتصدير الفيديو" },
  libTitle: { en: "Your Library", ar: "مكتبتك" },
  libSub: { en: "videos created · reusable in Auto Quran", ar: "فيديو · قابلة للاستخدام في أوتو قرآن" },
  libNew: { en: "New video", ar: "فيديو جديد" },
  libEmptyT: { en: "No videos yet", ar: "لا توجد فيديوهات بعد" },
  libEmptyS: {
    en: "Compose a passage in the Studio and export it — your finished reels land here, ready to download or send to Auto Quran.",
    ar: "أنشئ مقطعًا في الاستوديو وصدّره — تظهر فيديوهاتك هنا جاهزة للتنزيل أو الإرسال إلى أوتو قرآن.",
  },
  libGoStudio: { en: "Open the Studio", ar: "افتح الاستوديو" },
  acctTitle: { en: "Account", ar: "الحساب" },
  acctSub: { en: "Your Wisdom From Quran account", ar: "حسابك في حكمة من القرآن" },
  planLabel: { en: "Studio plan · shared", ar: "باقة الاستوديو · مشتركة" },
  signOut: { en: "Sign out", ar: "تسجيل الخروج" },
  linkedPages: { en: "Linked Instagram pages", ar: "صفحات إنستغرام المرتبطة" },
  igChannel1: { en: "Quran Instagram channel", ar: "قناة قرآنية على إنستغرام" },
  igChannel2: { en: "حكمة من القرآن", ar: "حكمة من القرآن" },
  connected: { en: "Connected", ar: "متصل" },
  crossH: { en: "Auto Quran", ar: "أوتو قرآن" },
  crossS: { en: "Post your library videos automatically to your pages.", ar: "انشر فيديوهات مكتبتك تلقائيًا على صفحاتك." },
  crossOpen: { en: "Open", ar: "فتح" },
  defaults: { en: "Studio defaults", ar: "إعدادات الاستوديو" },
  prefLang: { en: "Interface language", ar: "لغة الواجهة" },
  prefLangSub: { en: "Verse text stays Arabic", ar: "نص الآيات يبقى عربيًا" },
  prefReciter: { en: "Default reciter", ar: "القارئ الافتراضي" },
  prefFont: { en: "Default typeface", ar: "الخط الافتراضي" },
  prefColor: { en: "Default text color", ar: "لون النص الافتراضي" },
  storage: { en: "Library storage", ar: "مساحة المكتبة" },
  ofStorage: { en: "of 5 GB used", ar: "من 5 غيغابايت مستخدمة" },
  footnote: {
    en: "ChromaQuran · a free Quran video studio — part of Wisdom From Quran",
    ar: "كروما قرآن · استوديو فيديوهات قرآنية مجاني — من حكمة من القرآن",
  },
  credits: { en: "About & credits", ar: "عن المشروع والمصادر" },
  exportTitle: { en: "Render & Export", ar: "المعالجة والتصدير" },
  sumPassage: { en: "Passage", ar: "المقطع" },
  sumReciter: { en: "Reciter", ar: "القارئ" },
  sumFont: { en: "Typeface", ar: "الخط" },
  sumFormat: { en: "Format", ar: "الصيغة" },
  stPrep: { en: "Preparing the black canvas", ar: "تجهيز اللوحة السوداء" },
  stType: { en: "Typesetting the verses", ar: "رصّ الآيات" },
  stSync: { en: "Syncing recitation timing", ar: "مزامنة توقيت التلاوة" },
  stEncode: { en: "Encoding 1080×1920 MP4", ar: "ترميز فيديو 1080×1920" },
  stFinal: { en: "Finalizing", ar: "اللمسات الأخيرة" },
  doneReady: { en: "ready & saved to your library", ar: "جاهز ومحفوظ في مكتبتك" },
  doDownload: { en: "Download .mp4", ar: "تنزيل .mp4" },
  doSendAuto: { en: "Send to Auto Quran", ar: "إرسال إلى أوتو قرآن" },
  shareIg: { en: "Share on Instagram", ar: "نشر على إنستغرام" },
  sharing: { en: "Sharing…", ar: "جارٍ النشر…" },
};

export function t(key: string, lang: Lang): string {
  const o = I18N[key];
  return o ? o[lang] || o.en : key;
}

export function msg(en: string, ar: string, lang: Lang): string {
  return lang === "en" ? en : ar;
}

export function vWord(n: number, lang: Lang): string {
  return lang === "en" ? (n === 1 ? "verse" : "verses") : "آية";
}
