import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: produces .next/standalone with a minimal server.js,
  // so the Docker runtime image doesn't need the full node_modules.
  output: "standalone",
  // Permite abrir el dev server desde otros hosts (p. ej. por Tailscale) sin
  // que Next bloquee los recursos de desarrollo. Solo afecta `next dev`.
  allowedDevOrigins: ["100.67.196.109"],
};

export default nextConfig;
