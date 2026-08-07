/** Imagem usada quando a matéria não tem foto ou quando o portal de origem falha. */
export const FALLBACK_IMAGE = "/netfor-banner.jpeg";

/**
 * Portais que precisam passar pelo nosso proxy — HOJE, NENHUM.
 *
 * ---------------------------------------------------------------------------
 * POR QUE A LISTA ESVAZIOU
 * ---------------------------------------------------------------------------
 * O proxy nasceu porque o CloudFront do Diário do Nordeste devolve 403 para
 * requisição sem `User-Agent`, e o diagnóstico da época era que o otimizador do
 * Next não manda UA. Isso continua verdade na CDN: medido em 07/08/2026, sem o
 * cabeçalho dá 403; com QUALQUER UA, 200.
 *
 * O que mudou é o outro lado. Neste runtime (OpenNext no Cloudflare) o
 * otimizador manda um UA que a CDN aceita — a URL remota crua volta 200 em
 * `image/webp` nas larguras 384, 750 e 1080, verificado em produção.
 *
 * E o proxy virou justamente o que QUEBRAVA essas imagens: o otimizador roda
 * DENTRO do Worker, e um Worker não consegue fazer subrequisição para a própria
 * rota dinâmica. O caminho `/api/imagem/...` respondia 200 para o mundo e
 * falhava só para o otimizador, então toda foto do Diário do Nordeste caía no
 * banner de fallback — provavelmente por meses, sem ninguém notar.
 *
 * Discriminação que fechou o diagnóstico, tudo em produção:
 *   estático local via otimizador  → 200
 *   remoto (glbimg) via otimizador → 200
 *   /api/imagem/ direto            → 200
 *   /api/imagem/ via otimizador    → falha
 *
 * A lista fica aqui, vazia, junto com a rota: se algum portal voltar a bloquear
 * de um jeito que o otimizador não vença, basta reinserir o host — mas saiba
 * que, no Cloudflare, proxiar por rota própria e otimizar depois NÃO funciona.
 * Naquele caso o caminho é `unoptimized` apontando para o proxy.
 */
const HOSTS_VIA_PROXY: string[] = [];

function precisaDeProxy(src: string): boolean {
  try {
    const { hostname } = new URL(src);
    return HOSTS_VIA_PROXY.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

/**
 * Endereço final da imagem. Tudo sai pelo domínio do NETFOR: as normais via
 * otimizador do Next, as de CDN hostil via nosso proxy (que o otimizador
 * também consegue ler, porque somos nós servindo).
 */
export function urlDaImagem(src: string): string {
  if (!precisaDeProxy(src)) return src;
  // base64url no caminho, sem query: permite exigir `search: ""` no
  // `localPatterns` do otimizador em vez de liberar qualquer query.
  const base64 = btoa(src).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `/api/imagem/${base64}`;
}
