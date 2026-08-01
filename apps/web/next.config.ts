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

/**
 * AdSense. Liberado ANTES de ativar, de propósito: quando o beacon do Web
 * Analytics ficou de fora da CSP, a medição morreu em silêncio com o painel
 * ainda dizendo "ativo". Com anúncio o sintoma seria pior — espaço em branco no
 * lugar do anúncio, sem erro visível. Sem `NEXT_PUBLIC_ADSENSE_CLIENT` nada é
 * carregado, então liberar aqui não abre superfície nenhuma hoje.
 */
/** Player dos cantos. Sem isto na CSP o iframe é bloqueado sem erro visível. */
const YOUTUBE = ["https://www.youtube-nocookie.com", "https://www.youtube.com"];

const ADSENSE = [
  "https://pagead2.googlesyndication.com",
  "https://*.googlesyndication.com",
  "https://*.googleadservices.com",
  "https://*.doubleclick.net",
  "https://*.google.com",
  "https://*.gstatic.com",
];

/**
 * O React em modo de desenvolvimento usa `eval()` para reconstruir pilha de
 * chamada e outras ferramentas de depuração — sem `'unsafe-eval'` o console
 * enche de erro e o debug fica cego. Em produção o React nunca usa eval, então
 * a permissão fica restrita ao dev e NÃO vaza para o site publicado.
 */
const DEV = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ""} ${CF_ANALYTICS_SCRIPT} ${ADSENSE.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  // Imagens vêm dos portais agregados; o otimizador do Next serve como data:/blob:
  "img-src 'self' data: blob: https:",
  // Anúncio é servido dentro de iframe do Google.
  `frame-src 'self' ${ADSENSE.join(" ")} ${YOUTUBE.join(" ")}`,
  "font-src 'self' data:",
  `connect-src 'self' ${CF_ANALYTICS_SCRIPT} ${CF_ANALYTICS_BEACON} ${ADSENSE.join(" ")}`,
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
  experimental: {
    /**
     * CORREÇÃO DO ERRO 1101 — não mexer sem entender o porquê.
     *
     * O Next descomprime o "postponed state" do PPR com `inflateSync` e passa
     * `maxOutputLength = maxPostponedStateSize * 5`, com padrão de 100MB → 500MB.
     * O `node:zlib` do workerd aceita no máximo 128MB (134217728) e responde com
     * RangeError. Resultado em produção, a cada requisição:
     *
     *   Failed to parse postponed state RangeError: The value of
     *   "options.maxOutputLength" is out of range … Received 524288000
     *
     * Falhar aqui não derruba a página — derruba o CACHE. O shell pré-renderizado
     * vira inútil, toda requisição renderiza do zero e regrava as entradas: ~5
     * put() no KV por requisição. Com o teto de 1000/dia do plano free, ~170
     * visitas zeram a cota; daí em diante todo acesso é render frio contra o
     * Neon e o Worker começa a estourar. É o "funciona de manhã e morre" diário.
     *
     * 16MB × 5 = 80MB, folgado abaixo do teto do workerd. O estado real das
     * nossas páginas é da ordem de KB, então o limite nunca aperta de fato.
     */
    maxPostponedStateSize: "16mb",
  },
  /**
   * Perfil da página de matéria.
   *
   * Matéria publicada é imutável na prática: o pipeline insere com
   * `onConflictDoNothing` e edição depois da aprovação é rara — e quando
   * acontece, o painel revalida a tag `article-<slug>` daquela matéria, sem
   * depender do tempo. Então não há motivo para reescrever essa entrada de
   * cache a cada dia: 30 dias derruba a escrita no KV sem nenhum custo
   * editorial.
   *
   * `stale` fica em 1h porque é o que o router do cliente guarda em memória; não
   * gera escrita. `expire` vai a 60 dias para que a entrada nunca precise de um
   * refetch bloqueante logo depois da revalidação.
   */
  cacheLife: {
    materia: {
      stale: 3600,
      revalidate: 2_592_000,
      expire: 5_184_000,
    },
  },
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
    /**
     * Declarar `localPatterns` BLOQUEIA todo caminho local não listado — por
     * isso os assets do próprio site precisam constar, não só o proxy. Ambos
     * exigem `search: ""`: omitir o campo aceitaria qualquer query, que é o que
     * a documentação do Next desaconselha.
     */
    localPatterns: [
      { pathname: "/api/imagem/**", search: "" },
      { pathname: "/**", search: "" },
    ],
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
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
