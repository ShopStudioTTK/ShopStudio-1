import type { NextConfig } from "next";
import { cabecalhosDeSeguranca } from "./src/lib/seguranca";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // não anunciar "X-Powered-By: Next.js"
  poweredByHeader: false,
  // material.ts lê os .md do disco; sem isso eles não entram no deploy das rotas de IA.
  outputFileTracingIncludes: {
    "/api/assistente": ["src/lib/conhecimento/*.md"],
    "/api/roteiro": ["src/lib/conhecimento/*.md"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: cabecalhosDeSeguranca(
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
          process.env.NODE_ENV !== "production",
        ),
      },
    ];
  },
};

export default nextConfig;
