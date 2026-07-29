import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@netfor/db"],
  images: {
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
