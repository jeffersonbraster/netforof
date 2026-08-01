/** Imagem usada quando a matéria não tem foto ou quando o portal de origem falha. */
export const FALLBACK_IMAGE = "/netfor-banner.jpeg";

/**
 * Portais cujo CDN devolve 403 para requisição sem `User-Agent` — exatamente o
 * que o otimizador do Next envia. Verificado no CloudFront do Diário do
 * Nordeste: sem UA = 403, com UA = 200.
 *
 * A solução anterior era `unoptimized`, que fazia o NAVEGADOR buscar direto na
 * CDN deles — a única imagem do site que o leitor pegava de um domínio de
 * terceiro. Agora passam pelo nosso proxy, que manda UA e entrega pelo nosso
 * domínio, e o otimizador do Next segue no caminho normalmente.
 */
const HOSTS_VIA_PROXY = ["verdesmares.com.br"];

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
