import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: produces .next/standalone with a minimal server.js,
  // so the Docker runtime image doesn't need the full node_modules.
  output: "standalone",
};

export default nextConfig;
