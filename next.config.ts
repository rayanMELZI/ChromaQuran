import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // keep the native/heavy render deps out of the bundle — required at runtime from node_modules
  serverExternalPackages: ["playwright", "ffmpeg-static", "pg"],
  // Hide the dev-mode indicator badge — otherwise the headless render screenshots it
  // into the bottom-left of exported frames in `next dev`.
  devIndicators: false,
  // NOTE: /api/pipeline/* is proxied to Auto Quran by a RUNTIME route handler
  // (app/api/pipeline/[...path]/route.ts), NOT a build-time rewrite — a rewrite bakes
  // AUTOQURAN_API_URL at build time, which is wrong inside the Docker image.
};

export default nextConfig;
