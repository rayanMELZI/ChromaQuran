import type { Metadata } from "next";
import "./globals.css";
import { StudioProvider } from "@/contexts/StudioContext";

export const metadata: Metadata = {
  title: "ChromaQuran — كروما قرآن",
  description:
    "Black-canvas Quran video studio — pick a surah and verses, a reciter and a typeface, preview the verse on a pure-black 9:16 canvas, and export a finished vertical video.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* Layout direction stays LTR regardless of UI language (verse text is RTL locally). */
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=El+Messiri:wght@500;600;700&family=Tajawal:wght@300;400;500;700&family=Cormorant+Garamond:wght@500;600&family=Amiri+Quran&family=Scheherazade+New:wght@400;500;700&family=Noto+Naskh+Arabic:wght@400;500;700&family=Lateef:wght@400;500;700&family=Reem+Kufi:wght@400;500;700&family=Aref+Ruqaa:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StudioProvider>{children}</StudioProvider>
      </body>
    </html>
  );
}
