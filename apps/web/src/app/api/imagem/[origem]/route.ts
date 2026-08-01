/**
 * Proxy de imagem.
 *
 * Existe por um caso só: o CloudFront do Diário do Nordeste devolve 403 para
 * requisição sem `User-Agent` — que é exatamente o que o otimizador do Next
 * manda. A saída anterior era `unoptimized`, que fazia o NAVEGADOR buscar
 * direto na CDN deles: a única imagem do site que o leitor pegava de domínio
 * de terceiro. Aqui buscamos nós, com UA, e entregamos pelo nosso domínio.
 *
 * A origem vai no CAMINHO, em base64url, e não em query string. Assim o
 * `localPatterns` do otimizador pode exigir `search: ""` — omitir o campo
 * aceitaria QUALQUER query, que é justamente o que a documentação do Next
 * desaconselha.
 *
 * Proxy aberto é vetor de abuso (SSRF, roubo de banda), então: allowlist de
 * host, só https, `redirect: "manual"` para não seguir cadeia até IP interno,
 * content-type obrigatoriamente de imagem e teto de tamanho.
 */

const HOSTS_PERMITIDOS = ["diariodonordeste.verdesmares.com.br", "verdesmares.com.br"];
const MAX_BYTES = 8 * 1024 * 1024;

function decodificar(origem: string): string | null {
  try {
    const base64 = origem.replace(/-/g, "+").replace(/_/g, "/");
    return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  } catch {
    return null;
  }
}

function hostPermitido(url: URL): boolean {
  return HOSTS_PERMITIDOS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
}

export async function GET(_request: Request, ctx: { params: Promise<{ origem: string }> }) {
  const { origem } = await ctx.params;
  const alvo = decodificar(origem);
  if (!alvo) return new Response("origem inválida", { status: 400 });

  let destino: URL;
  try {
    destino = new URL(alvo);
  } catch {
    return new Response("url inválida", { status: 400 });
  }

  if (destino.protocol !== "https:" || !hostPermitido(destino)) {
    return new Response("host não permitido", { status: 403 });
  }

  const resposta = await fetch(destino, {
    headers: {
      // O motivo de tudo isto existir.
      "user-agent": "Mozilla/5.0 (compatible; NetForBot/1.0; +https://netfor.com.br)",
      accept: "image/avif,image/webp,image/*,*/*;q=0.8",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (!resposta || !resposta.ok) return new Response("origem indisponível", { status: 502 });

  const tipo = resposta.headers.get("content-type") ?? "";
  if (!tipo.startsWith("image/")) return new Response("conteúdo não é imagem", { status: 415 });

  const tamanho = Number(resposta.headers.get("content-length") ?? 0);
  if (tamanho > MAX_BYTES) return new Response("imagem grande demais", { status: 413 });

  return new Response(resposta.body, {
    headers: {
      "content-type": tipo,
      "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
