import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // keep the native/heavy render deps out of the bundle — required at runtime from node_modules
  serverExternalPackages: ["playwright", "ffmpeg-static", "pg"],
  // Hide the dev-mode indicator badge — otherwise the headless render screenshots it
  // into the bottom-left of exported frames in `next dev`.
  devIndicators: false,
};

export default nextConfig;
