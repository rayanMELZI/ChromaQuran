import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // keep the native/heavy render deps out of the bundle — required at runtime from node_modules
  serverExternalPackages: ["playwright", "ffmpeg-static", "pg"],
};

export default nextConfig;
