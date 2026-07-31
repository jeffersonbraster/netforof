/** Imagem usada quando a matéria não tem foto ou quando o portal de origem falha. */
export const FALLBACK_IMAGE = "/netfor-banner.jpeg";

/**
 * Portais cujo CDN devolve 403 para requisição sem `User-Agent` — exatamente o
 * que o otimizador do Next envia ao buscar a imagem no servidor. Para esses,
 * servimos a URL original direto ao navegador (que manda UA e carrega normal),
 * em vez de perder a foto. Verificado em 31/07/2026 no CloudFront do Diário do
 * Nordeste: sem UA = 403, com UA = 200.
 */
const HOSTS_SEM_OTIMIZADOR = ["verdesmares.com.br"];

export function pularOtimizador(src: string): boolean {
  try {
    const { hostname } = new URL(src);
    return HOSTS_SEM_OTIMIZADOR.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}
