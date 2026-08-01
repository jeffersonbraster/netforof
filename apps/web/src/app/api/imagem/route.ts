/**
 * Proxy de imagem.
 *
 * Existe por um caso só: o CloudFront do Diário do Nordeste devolve 403 para
 * requisição sem `User-Agent` — que é exatamente o que o otimizador do Next
 * manda. A saída anterior era `unoptimized`, que fazia o NAVEGADOR buscar
 * direto na CDN deles: a única brecha em que o leitor tocava um domínio de
 * terceiro. Aqui buscamos nós, com UA, e entregamos pelo nosso domínio.
 *
 * Proxy aberto é vetor de abuso (SSRF, roubo de banda), então:
 * - allowlist de host, nada de "qualquer URL";
 * - só https, e `redirect: "manual"` para não seguir cadeia para IP interno;
 * - teto de tamanho e content-type obrigatoriamente de imagem;
 * - cache longo na borda, porque a imagem de matéria não muda.
 */

const HOSTS_PERMITIDOS = [
  "diariodonordeste.verdesmares.com.br",
  "verdesmares.com.br",
];

const MAX_BYTES = 8 * 1024 * 1024;

function hostPermitido(url: URL): boolean {
  return HOSTS_PERMITIDOS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
}

export async function GET(request: Request) {
  const alvo = new URL(request.url).searchParams.get("url");
  if (!alvo) return new Response("url ausente", { status: 400 });

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

  if (!resposta || !resposta.ok) {
    return new Response("origem indisponível", { status: 502 });
  }

  const tipo = resposta.headers.get("content-type") ?? "";
  if (!tipo.startsWith("image/")) {
    return new Response("conteúdo não é imagem", { status: 415 });
  }

  const tamanho = Number(resposta.headers.get("content-length") ?? 0);
  if (tamanho > MAX_BYTES) {
    return new Response("imagem grande demais", { status: 413 });
  }

  return new Response(resposta.body, {
    headers: {
      "content-type": tipo,
      // Imagem de matéria não muda: cachear forte tira o custo da repetição.
      "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
