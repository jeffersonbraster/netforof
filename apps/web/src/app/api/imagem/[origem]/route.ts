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
 *
 * É também a rota mais CARA do site: cada chamada dispara um fetch externo de
 * até 8 MB e ocupa o Worker enquanto isso. Era a única sem teto por IP — num
 * plano com orçamento fechado, é justamente a que mais precisa. Mesmo limitador
 * de /api/views e /api/busca, com chave própria para não competir com elas.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

const HOSTS_PERMITIDOS = ["diariodonordeste.verdesmares.com.br", "verdesmares.com.br"];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Teto por IP — e ele FALHA ABERTO, de propósito.
 *
 * Duas armadilhas descobertas em 07/08/2026, com o mesmo sintoma: toda imagem
 * do Diário do Nordeste caindo no banner de fallback, em produção e no dev.
 *
 * 1. `getCloudflareContext()` LANÇA quando não há contexto de requisição —
 *    `next dev` não tem, e a busca interna do otimizador de imagem também não.
 *    A exceção não era tratada, então a rota devolvia 500 e o otimizador
 *    respondia "upstream response is invalid". Nenhuma dessas imagens chegava
 *    ao leitor.
 *
 * 2. Sem `cf-connecting-ip` o código usava a chave literal `imagem:desconhecido`
 *    — uma só para TODAS as buscas internas do otimizador. Isso não protege
 *    ninguém (busca interna não é abuso) e derruba o portal inteiro assim que o
 *    balde compartilhado esvazia.
 *
 * O limitador existe contra abuso EXTERNO, e abuso externo sempre chega com
 * `cf-connecting-ip` preenchido pela Cloudflare. Sem esse cabeçalho não há o que
 * limitar por IP, e recusar seria trocar uma proteção que não existe por uma
 * falha que existe.
 */
async function dentroDoLimite(request: Request): Promise<boolean> {
  // `cf-connecting-ip` é preenchido pela Cloudflare e não é forjável pelo
  // cliente — ao contrário de `x-forwarded-for`.
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return true;

  try {
    const limitador = getCloudflareContext().env.VIEWS_RATE_LIMITER;
    if (!limitador) return true;
    const { success } = await limitador.limit({ key: `imagem:${ip}` });
    return success;
  } catch {
    // Sem contexto não dá para limitar. Servir a imagem é o desfecho seguro:
    // o pior caso é uma requisição a mais; o outro pior caso é o portal sem
    // foto nenhuma.
    return true;
  }
}

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

export async function GET(request: Request, ctx: { params: Promise<{ origem: string }> }) {
  if (!(await dentroDoLimite(request))) {
    return new Response("muitas requisições", { status: 429, headers: { "retry-after": "60" } });
  }

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
