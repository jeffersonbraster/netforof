import { and, articles, desc, eq, ilike, isNotNull, or, sources } from "@netfor/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { db } from "@/lib/db";

/**
 * Busca ao vivo do spotlight.
 *
 * Rota dinâmica de propósito — não entra no cache incremental. Resultado de
 * busca é por-consulta: cachear geraria uma entrada de KV por termo digitado,
 * que é exatamente o buraco de cardinalidade que fechamos nas listagens.
 *
 * Mesmas travas do /api/views: mesma origem (higiene) e rate limit por IP
 * (o teto real). Sem elas, cada tecla digitada por um robô vira uma consulta
 * ao Neon.
 */

const MIN_TERMO = 2;
const MAX_TERMO = 80;
const LIMITE = 8;

function veioDoProprioSite(request: Request): boolean {
  const destino = request.headers.get("sec-fetch-site");
  if (destino && destino !== "same-origin") return false;

  const origem = request.headers.get("origin");
  if (!origem) return true;

  try {
    return new URL(origem).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function dentroDoLimite(request: Request): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return true;
  try {
    const limitador = getCloudflareContext().env.VIEWS_RATE_LIMITER;
    if (!limitador) return true;
    const { success } = await limitador.limit({ key: `busca:${ip}` });
    return success;
  } catch {
    return true;
  }
}

export async function GET(request: Request) {
  if (!veioDoProprioSite(request)) {
    return Response.json({ error: "origem inválida" }, { status: 403 });
  }

  const termo = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (termo.length < MIN_TERMO) return Response.json({ itens: [] });

  if (!(await dentroDoLimite(request))) {
    return Response.json({ error: "muitas buscas" }, { status: 429 });
  }

  // `%` e `_` são curingas do LIKE: escapar evita que o usuário transforme a
  // busca numa varredura da tabela inteira.
  const alvo = `%${termo.slice(0, MAX_TERMO).replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

  const itens = await db
    .select({
      titulo: articles.title,
      slug: articles.slug,
      resumo: articles.excerpt,
      imagemUrl: articles.imageUrl,
      categoria: articles.category,
      veiculo: sources.name,
      publicadaEm: articles.publishedAt,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(
      and(
        eq(articles.status, "published"),
        isNotNull(articles.content),
        or(ilike(articles.title, alvo), ilike(articles.excerpt, alvo)),
      ),
    )
    .orderBy(desc(articles.publishedAt))
    .limit(LIMITE);

  return Response.json(
    { itens },
    { headers: { "cache-control": "private, no-store" } },
  );
}
