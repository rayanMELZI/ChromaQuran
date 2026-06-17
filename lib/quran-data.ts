/* ChromaQuran — data layer.
 * SURAHS: full 114 list (metadata) powering the searchable picker.
 * Verse text for all 114 surahs is loaded on demand from /public/data/surahs/{n}.json
 * via loadSurahAyahs() (files generated once by scripts/fetch-quran.mjs).
 * RECITERS / FONTS / COLORS: curated options exposed in the Studio.
 */

export interface Surah {
  n: number;
  ar: string;
  tr: string;
  en: string;
  ayahs: number;
  place: "Meccan" | "Medinan";
}

export interface Ayah {
  n: number;
  ar: string;
  en: string;
}

export interface Reciter {
  id: string;
  ar: string;
  en: string;
  style: string;
}

export interface QFont {
  id: string;
  family: string;
  label: string;
  note: string;
}

export interface ColorPreset {
  id: string;
  label: string;
  value: string;
}

/* Arabic-Indic digits helper (shared) */
export function toArabicDigits(n: number | string): string {
  const d = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n).replace(/[0-9]/g, (x) => d[+x]);
}

/* ---------------- 114 surahs ----------------
 * [number, arabicName, transliteration, englishMeaning, ayahCount, place] */
const RAW: [number, string, string, string, number, "Meccan" | "Medinan"][] = [
  [1, "الفاتحة", "Al-Fatihah", "The Opening", 7, "Meccan"],
  [2, "البقرة", "Al-Baqarah", "The Cow", 286, "Medinan"],
  [3, "آل عمران", "Aal-E-Imran", "The Family of Imran", 200, "Medinan"],
  [4, "النساء", "An-Nisa", "The Women", 176, "Medinan"],
  [5, "المائدة", "Al-Ma'idah", "The Table Spread", 120, "Medinan"],
  [6, "الأنعام", "Al-An'am", "The Cattle", 165, "Meccan"],
  [7, "الأعراف", "Al-A'raf", "The Heights", 206, "Meccan"],
  [8, "الأنفال", "Al-Anfal", "The Spoils of War", 75, "Medinan"],
  [9, "التوبة", "At-Tawbah", "The Repentance", 129, "Medinan"],
  [10, "يونس", "Yunus", "Jonah", 109, "Meccan"],
  [11, "هود", "Hud", "Hud", 123, "Meccan"],
  [12, "يوسف", "Yusuf", "Joseph", 111, "Meccan"],
  [13, "الرعد", "Ar-Ra'd", "The Thunder", 43, "Medinan"],
  [14, "إبراهيم", "Ibrahim", "Abraham", 52, "Meccan"],
  [15, "الحجر", "Al-Hijr", "The Rocky Tract", 99, "Meccan"],
  [16, "النحل", "An-Nahl", "The Bee", 128, "Meccan"],
  [17, "الإسراء", "Al-Isra", "The Night Journey", 111, "Meccan"],
  [18, "الكهف", "Al-Kahf", "The Cave", 110, "Meccan"],
  [19, "مريم", "Maryam", "Mary", 98, "Meccan"],
  [20, "طه", "Ta-Ha", "Ta-Ha", 135, "Meccan"],
  [21, "الأنبياء", "Al-Anbiya", "The Prophets", 112, "Meccan"],
  [22, "الحج", "Al-Hajj", "The Pilgrimage", 78, "Medinan"],
  [23, "المؤمنون", "Al-Mu'minun", "The Believers", 118, "Meccan"],
  [24, "النور", "An-Nur", "The Light", 64, "Medinan"],
  [25, "الفرقان", "Al-Furqan", "The Criterion", 77, "Meccan"],
  [26, "الشعراء", "Ash-Shu'ara", "The Poets", 227, "Meccan"],
  [27, "النمل", "An-Naml", "The Ant", 93, "Meccan"],
  [28, "القصص", "Al-Qasas", "The Stories", 88, "Meccan"],
  [29, "العنكبوت", "Al-Ankabut", "The Spider", 69, "Meccan"],
  [30, "الروم", "Ar-Rum", "The Romans", 60, "Meccan"],
  [31, "لقمان", "Luqman", "Luqman", 34, "Meccan"],
  [32, "السجدة", "As-Sajdah", "The Prostration", 30, "Meccan"],
  [33, "الأحزاب", "Al-Ahzab", "The Combined Forces", 73, "Medinan"],
  [34, "سبأ", "Saba", "Sheba", 54, "Meccan"],
  [35, "فاطر", "Fatir", "Originator", 45, "Meccan"],
  [36, "يس", "Ya-Sin", "Ya Sin", 83, "Meccan"],
  [37, "الصافات", "As-Saffat", "Those Who Set the Ranks", 182, "Meccan"],
  [38, "ص", "Sad", "Sad", 88, "Meccan"],
  [39, "الزمر", "Az-Zumar", "The Troops", 75, "Meccan"],
  [40, "غافر", "Ghafir", "The Forgiver", 85, "Meccan"],
  [41, "فصلت", "Fussilat", "Explained in Detail", 54, "Meccan"],
  [42, "الشورى", "Ash-Shura", "The Consultation", 53, "Meccan"],
  [43, "الزخرف", "Az-Zukhruf", "The Ornaments of Gold", 89, "Meccan"],
  [44, "الدخان", "Ad-Dukhan", "The Smoke", 59, "Meccan"],
  [45, "الجاثية", "Al-Jathiyah", "The Crouching", 37, "Meccan"],
  [46, "الأحقاف", "Al-Ahqaf", "The Wind-Curved Sandhills", 35, "Meccan"],
  [47, "محمد", "Muhammad", "Muhammad", 38, "Medinan"],
  [48, "الفتح", "Al-Fath", "The Victory", 29, "Medinan"],
  [49, "الحجرات", "Al-Hujurat", "The Rooms", 18, "Medinan"],
  [50, "ق", "Qaf", "Qaf", 45, "Meccan"],
  [51, "الذاريات", "Adh-Dhariyat", "The Winnowing Winds", 60, "Meccan"],
  [52, "الطور", "At-Tur", "The Mount", 49, "Meccan"],
  [53, "النجم", "An-Najm", "The Star", 62, "Meccan"],
  [54, "القمر", "Al-Qamar", "The Moon", 55, "Meccan"],
  [55, "الرحمن", "Ar-Rahman", "The Beneficent", 78, "Medinan"],
  [56, "الواقعة", "Al-Waqi'ah", "The Inevitable", 96, "Meccan"],
  [57, "الحديد", "Al-Hadid", "The Iron", 29, "Medinan"],
  [58, "المجادلة", "Al-Mujadila", "The Pleading Woman", 22, "Medinan"],
  [59, "الحشر", "Al-Hashr", "The Exile", 24, "Medinan"],
  [60, "الممتحنة", "Al-Mumtahanah", "She Who Is Examined", 13, "Medinan"],
  [61, "الصف", "As-Saff", "The Ranks", 14, "Medinan"],
  [62, "الجمعة", "Al-Jumu'ah", "The Congregation", 11, "Medinan"],
  [63, "المنافقون", "Al-Munafiqun", "The Hypocrites", 11, "Medinan"],
  [64, "التغابن", "At-Taghabun", "The Mutual Disillusion", 18, "Medinan"],
  [65, "الطلاق", "At-Talaq", "The Divorce", 12, "Medinan"],
  [66, "التحريم", "At-Tahrim", "The Prohibition", 12, "Medinan"],
  [67, "الملك", "Al-Mulk", "The Sovereignty", 30, "Meccan"],
  [68, "القلم", "Al-Qalam", "The Pen", 52, "Meccan"],
  [69, "الحاقة", "Al-Haqqah", "The Reality", 52, "Meccan"],
  [70, "المعارج", "Al-Ma'arij", "The Ascending Stairways", 44, "Meccan"],
  [71, "نوح", "Nuh", "Noah", 28, "Meccan"],
  [72, "الجن", "Al-Jinn", "The Jinn", 28, "Meccan"],
  [73, "المزمل", "Al-Muzzammil", "The Enshrouded One", 20, "Meccan"],
  [74, "المدثر", "Al-Muddaththir", "The Cloaked One", 56, "Meccan"],
  [75, "القيامة", "Al-Qiyamah", "The Resurrection", 40, "Meccan"],
  [76, "الإنسان", "Al-Insan", "Man", 31, "Medinan"],
  [77, "المرسلات", "Al-Mursalat", "The Emissaries", 50, "Meccan"],
  [78, "النبأ", "An-Naba", "The Tidings", 40, "Meccan"],
  [79, "النازعات", "An-Nazi'at", "Those Who Drag Forth", 46, "Meccan"],
  [80, "عبس", "Abasa", "He Frowned", 42, "Meccan"],
  [81, "التكوير", "At-Takwir", "The Overthrowing", 29, "Meccan"],
  [82, "الإنفطار", "Al-Infitar", "The Cleaving", 19, "Meccan"],
  [83, "المطففين", "Al-Mutaffifin", "The Defrauding", 36, "Meccan"],
  [84, "الإنشقاق", "Al-Inshiqaq", "The Sundering", 25, "Meccan"],
  [85, "البروج", "Al-Buruj", "The Mansions of the Stars", 22, "Meccan"],
  [86, "الطارق", "At-Tariq", "The Morning Star", 17, "Meccan"],
  [87, "الأعلى", "Al-A'la", "The Most High", 19, "Meccan"],
  [88, "الغاشية", "Al-Ghashiyah", "The Overwhelming", 26, "Meccan"],
  [89, "الفجر", "Al-Fajr", "The Dawn", 30, "Meccan"],
  [90, "البلد", "Al-Balad", "The City", 20, "Meccan"],
  [91, "الشمس", "Ash-Shams", "The Sun", 15, "Meccan"],
  [92, "الليل", "Al-Layl", "The Night", 21, "Meccan"],
  [93, "الضحى", "Ad-Duha", "The Morning Hours", 11, "Meccan"],
  [94, "الشرح", "Ash-Sharh", "The Relief", 8, "Meccan"],
  [95, "التين", "At-Tin", "The Fig", 8, "Meccan"],
  [96, "العلق", "Al-Alaq", "The Clot", 19, "Meccan"],
  [97, "القدر", "Al-Qadr", "The Power", 5, "Meccan"],
  [98, "البينة", "Al-Bayyinah", "The Clear Proof", 8, "Medinan"],
  [99, "الزلزلة", "Az-Zalzalah", "The Earthquake", 8, "Medinan"],
  [100, "العاديات", "Al-Adiyat", "The Courser", 11, "Meccan"],
  [101, "القارعة", "Al-Qari'ah", "The Calamity", 11, "Meccan"],
  [102, "التكاثر", "At-Takathur", "The Rivalry in Increase", 8, "Meccan"],
  [103, "العصر", "Al-Asr", "The Declining Day", 3, "Meccan"],
  [104, "الهمزة", "Al-Humazah", "The Traducer", 9, "Meccan"],
  [105, "الفيل", "Al-Fil", "The Elephant", 5, "Meccan"],
  [106, "قريش", "Quraysh", "Quraysh", 4, "Meccan"],
  [107, "الماعون", "Al-Ma'un", "The Small Kindnesses", 7, "Meccan"],
  [108, "الكوثر", "Al-Kawthar", "The Abundance", 3, "Meccan"],
  [109, "الكافرون", "Al-Kafirun", "The Disbelievers", 6, "Meccan"],
  [110, "النصر", "An-Nasr", "The Divine Support", 3, "Medinan"],
  [111, "المسد", "Al-Masad", "The Palm Fiber", 5, "Meccan"],
  [112, "الإخلاص", "Al-Ikhlas", "Sincerity", 4, "Meccan"],
  [113, "الفلق", "Al-Falaq", "The Daybreak", 5, "Meccan"],
  [114, "الناس", "An-Nas", "Mankind", 6, "Meccan"],
];

export const SURAHS: Surah[] = RAW.map((r) => ({
  n: r[0],
  ar: r[1],
  tr: r[2],
  en: r[3],
  ayahs: r[4],
  place: r[5],
}));

/* Featured order shown at the top of the picker */
export const FEATURED: number[] = [1, 112, 113, 114, 103, 108, 55];

/* ---------------- reciters ---------------- */
export const RECITERS: Reciter[] = [
  { id: "alafasy", ar: "مشاري راشد العفاسي", en: "Mishary Rashid Alafasy", style: "Warm, measured · Kuwait" },
  { id: "abdulbasit", ar: "عبد الباسط عبد الصمد", en: "Abdul Basit Abdul Samad", style: "Mujawwad master · Egypt" },
  { id: "muaiqly", ar: "ماهر المعيقلي", en: "Maher Al-Muaiqly", style: "Haram imam · clear" },
  { id: "minshawi", ar: "محمد صديق المنشاوي", en: "Mohamed Al-Minshawi", style: "Classic, emotive · Egypt" },
  { id: "husary", ar: "محمود خليل الحصري", en: "Mahmoud Al-Husary", style: "Precise tajwid · Egypt" },
  { id: "sudais", ar: "عبد الرحمن السديس", en: "Abdul Rahman Al-Sudais", style: "Haram imam · resonant" },
  { id: "ghamdi", ar: "سعد الغامدي", en: "Saad Al-Ghamdi", style: "Soft, flowing · Saudi" },
];

/* ---------------- fonts (Google Fonts loaded in layout) ---------------- */
export const FONTS: QFont[] = [
  { id: "amiri", family: "'Amiri Quran', serif", label: "Amiri Quran", note: "Classic Naskh" },
  { id: "scheherazade", family: "'Scheherazade New', serif", label: "Scheherazade New", note: "Traditional" },
  { id: "noto", family: "'Noto Naskh Arabic', serif", label: "Noto Naskh", note: "Clean, modern" },
  { id: "lateef", family: "'Lateef', serif", label: "Lateef", note: "Rounded, soft" },
  { id: "kufi", family: "'Reem Kufi', sans-serif", label: "Reem Kufi", note: "Geometric Kufi" },
  { id: "ruqaa", family: "'Aref Ruqaa', serif", label: "Aref Ruqaa", note: "Calligraphic" },
];

/* ---------------- text color presets ---------------- */
export const COLORS: ColorPreset[] = [
  { id: "warm", label: "Warm white", value: "#f4ece0" },
  { id: "gold", label: "Gold", value: "#ecd9bb" },
  { id: "cyan", label: "Cyan", value: "#9bd8f2" },
];

/* ---------------- helpers ---------------- */
export function surah(n: number): Surah {
  return SURAHS[n - 1];
}
export function isFeatured(n: number): boolean {
  return FEATURED.includes(n);
}
export function colorVal(id: string): string {
  const c = COLORS.find((x) => x.id === id);
  return c ? c.value : "#f4ece0";
}
export function fontFam(id: string): string {
  const f = FONTS.find((x) => x.id === id);
  return f ? f.family : "'Amiri Quran',serif";
}
export function fontLabel(id: string): string {
  const f = FONTS.find((x) => x.id === id);
  return f ? f.label : id;
}
export function reciterObj(id: string): Reciter {
  return RECITERS.find((x) => x.id === id) || RECITERS[0];
}

/* per-reciter speed factor — TEMPORARY: drives the simulated timeline until Phase 2
 * replaces it with real per-ayah audio durations. */
export const SPEED: Record<string, number> = {
  alafasy: 1.0,
  abdulbasit: 1.38,
  muaiqly: 1.02,
  minshawi: 1.26,
  husary: 1.16,
  sudais: 1.06,
  ghamdi: 1.12,
};

/* ---------------- on-demand surah text loader ----------------
 * Verse text for all 114 surahs lives in /public/data/surahs/{n}.json
 * (generated once by scripts/fetch-quran.mjs). Loaded lazily, cached per surah,
 * so the initial bundle stays small and nginx serves the data directly. */
const surahCache = new Map<number, Ayah[]>();

export async function loadSurahAyahs(n: number): Promise<Ayah[]> {
  const cached = surahCache.get(n);
  if (cached) return cached;
  const res = await fetch(`/data/surahs/${n}.json`);
  if (!res.ok) throw new Error(`Failed to load surah ${n} (HTTP ${res.status})`);
  const data = (await res.json()) as { n: number; ayahs: Ayah[] };
  surahCache.set(n, data.ayahs);
  return data.ayahs;
}
