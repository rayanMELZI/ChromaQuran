import Link from "next/link";
import { Emblem } from "@/components/Emblem";

export const metadata = { title: "About & Credits — ChromaQuran" };

export default function AboutPage() {
  return (
    <div className="app" style={{ maxWidth: 760, paddingTop: 40 }}>
      <section className="card glass" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="brand">
          <span className="mark">
            <Emblem />
          </span>
          <div>
            <div className="t1">
              Chroma <b>Quran</b>
            </div>
            <div className="t2">Black-canvas Quran video studio</div>
          </div>
        </div>

        <p style={{ color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
          ChromaQuran composes and exports vertical (9:16) black-background Quran videos. Pick a surah and verse
          range, a reciter and a typeface, preview it on a pure-black canvas synced to the recitation, then render a
          downloadable MP4. It is a free, donation-supported project — part of <b>Wisdom From Quran</b>.
        </p>

        <div className="divider" />

        <div>
          <div className="section-label" style={{ marginBottom: 10 }}>Sources &amp; credits</div>
          <ul style={{ color: "var(--muted)", lineHeight: 1.8, margin: 0, paddingInlineStart: 20 }}>
            <li>
              <b style={{ color: "var(--text)" }}>Quran text (Uthmani):</b> the Tanzil project, via the{" "}
              <a href="https://alquran.cloud" target="_blank" rel="noreferrer" style={{ color: "var(--gold-soft)" }}>alquran.cloud</a> API.
              Used unaltered.
            </li>
            <li>
              <b style={{ color: "var(--text)" }}>English translation:</b> Saheeh International.
            </li>
            <li>
              <b style={{ color: "var(--text)" }}>Recitations:</b> the reciters listed in the Studio, hosted by{" "}
              <a href="https://everyayah.com" target="_blank" rel="noreferrer" style={{ color: "var(--gold-soft)" }}>everyayah.com</a>{" "}
              for free religious use.
            </li>
            <li>
              <b style={{ color: "var(--text)" }}>Typefaces:</b> El Messiri, Tajawal, Cormorant Garamond, Amiri Quran,
              Scheherazade New, Noto Naskh Arabic, Lateef, Reem Kufi, Aref Ruqaa — all SIL Open Font License (Google Fonts).
            </li>
          </ul>
        </div>

        <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>
          The Quran text, translation and recitations are provided free and are never sold. Please report any
          transcription issue so it can be corrected.
        </p>

        <div>
          <Link className="btn btn-ghost btn-sm" href="/">
            ← Back to the Studio
          </Link>
        </div>
      </section>
    </div>
  );
}
