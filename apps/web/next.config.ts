import { config } from "dotenv";
import type { NextConfig } from "next";

// Carrega o .env da raiz do monorepo (Next só lê .env do diretório do app)
config({ path: "../../.env" });

// Hostname de escape do Worker (ver wrangler.jsonc). Existe só para o webhook de
// revalidação driblar o Managed Challenge da zona; não deve ser indexado.
const WORKERS_DEV_HOST = "netfor.jejesavewords.workers.dev";

const nextConfig: NextConfig = {
  transpilePackages: ["@netfor/db"],
  cacheComponents: true,
  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: WORKERS_DEV_HOST }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  // View Transitions (React <ViewTransition>): pendente — o componente ainda é
  // exclusivo do canal experimental do React; reavaliar quando estabilizar.
  images: {
    // Transformações de imagens externas ficam cacheadas por 24h no mínimo
    minimumCacheTTL: 86400,
    qualities: [60, 75],
    remotePatterns: [
      // Portais agregados — liberados conforme adapters da Fase 3
      { protocol: "https", hostname: "*.glbimg.com" },
      { protocol: "https", hostname: "*.verdesmares.com.br" },
      { protocol: "https", hostname: "fortaleza1918.com.br" },
      { protocol: "https", hostname: "*.fortaleza1918.com.br" },
      { protocol: "https", hostname: "soufortaleza.com" },
      { protocol: "https", hostname: "*.soufortaleza.com" },
      { protocol: "https", hostname: "*.opovo.com.br" },
      { protocol: "https", hostname: "*.espncdn.com" },
      { protocol: "https", hostname: "media.api-sports.io" },
    ],
  },
};

export default nextConfig;
