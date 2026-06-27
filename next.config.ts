import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // keep the native/heavy render deps out of the bundle — required at runtime from node_modules
  serverExternalPackages: ["playwright", "ffmpeg-static", "pg"],
  // Hide the dev-mode indicator badge — otherwise the headless render screenshots it
  // into the bottom-left of exported frames in `next dev`.
  devIndicators: false,
  // Proxy /api/pipeline/* → Auto Quran Flask backend (server-side, no CORS issues).
  // Set AUTOQURAN_API_URL in .env.local; defaults to the Flask dev port.
  async rewrites() {
    return [
      {
        source: "/api/pipeline/:path*",
        destination: `${process.env.AUTOQURAN_API_URL ?? "http://localhost:5000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
