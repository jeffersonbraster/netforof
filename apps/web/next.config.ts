import { config } from "dotenv";
import type { NextConfig } from "next";

// Carrega o .env da raiz do monorepo (Next só lê .env do diretório do app)
config({ path: "../../.env" });

/**
 * Content-Security-Policy.
 *
 * `script-src` fica com 'unsafe-inline' de propósito: o Next injeta scripts
 * inline de hidratação e o boot de tema no <head> roda antes do React. Travar
 * isso exige nonce por requisição, incompatível com HTML cacheado na borda.
 * O risco é baixo — o portal não renderiza HTML de terceiros nem entrada de
 * usuário —, então o valor aqui está nas outras diretivas: `frame-ancestors`
 * mata clickjacking, `base-uri` e `form-action` fecham sequestro de <base> e
 * exfiltração por formulário, `object-src` derruba plugins legados.
 *
 * Ao ativar o AdSense, liberar aqui os domínios do Google (script/frame/img).
 */
// Cloudflare Web Analytics roda em instalação AUTOMÁTICA: a borda injeta o
// beacon no HTML, sem nenhum código nosso e sem site token (por isso o token não
// aparece no dashboard). Não instalar manualmente — daria contagem dobrada.
//
// Estes dois domínios são obrigatórios: o script vem de
// static.cloudflareinsights.com e reporta para cloudflareinsights.com. Sem eles
// a CSP derruba a medição em silêncio — o dashboard segue "ativo" e para de
// receber dado. Foi o que aconteceu entre subir a CSP e liberar os domínios.
//
// A injeção só ocorre para requisição com cara de navegador: `curl` sem
// User-Agent de browser NÃO recebe o beacon. Testar com UA real.
const CF_ANALYTICS_SCRIPT = "https://static.cloudflareinsights.com";
const CF_ANALYTICS_BEACON = "https://cloudflareinsights.com";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${CF_ANALYTICS_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  // Imagens vêm dos portais agregados; o otimizador do Next serve como data:/blob:
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${CF_ANALYTICS_SCRIPT} ${CF_ANALYTICS_BEACON}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  // 2 anos + preload: exigido para entrar na lista de HSTS dos navegadores.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Redundante com frame-ancestors, mas cobre navegador antigo sem suporte a CSP.
  { key: "X-Frame-Options", value: "DENY" },
  // Nada disso é usado pelo portal; negar por padrão.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@netfor/db"],
  cacheComponents: true,
  // Não anunciar a stack: reduz o custo de mapear alvo por versão.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      // www servia uma cópia completa do site, com 200 e sem canonical — dois
      // sites idênticos aos olhos do Google. Consolida no apex.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.netfor.com.br" }],
        destination: "https://netfor.com.br/:path*",
        permanent: true,
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
