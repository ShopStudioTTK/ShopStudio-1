import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // material.ts lê os .md do disco; sem isso eles não entram no deploy das rotas de IA.
  outputFileTracingIncludes: {
    "/api/assistente": ["src/lib/conhecimento/*.md"],
    "/api/roteiro": ["src/lib/conhecimento/*.md"],
  },
};

export default nextConfig;
