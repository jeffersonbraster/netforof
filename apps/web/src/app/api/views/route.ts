import { eq, sql } from "@netfor/db";

import { articles, articleViews } from "@netfor/db";

import { db } from "@/lib/db";

function todayInFortaleza(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Contador de leituras: aberto por natureza (o navegador chama sem credencial),
 * mas cada requisição custa um SELECT e um UPSERT no Neon. Sem nenhum filtro,
 * um laço de curl inflava as "mais lidas" e queimava cota de banco.
 *
 * Não é autenticação — é higiene: exige que a chamada tenha vindo do próprio
 * site, o que já descarta abuso trivial de fora. Rate limit de verdade, por IP,
 * é regra na borda da Cloudflare (o plano free permite uma).
 */
function veioDoProprioSite(request: Request): boolean {
  // Enviado por todo navegador atual; ausente em curl/script simples.
  const destino = request.headers.get("sec-fetch-site");
  if (destino && destino !== "same-origin") return false;

  const origem = request.headers.get("origin");
  if (!origem) return destino === "same-origin";

  try {
    return new URL(origem).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

const SLUG_VALIDO = /^[a-z0-9-]{1,200}$/;

export async function POST(request: Request) {
  if (!veioDoProprioSite(request)) {
    return Response.json({ error: "origem inválida" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { slug?: unknown };
  const slug = typeof body.slug === "string" ? body.slug : null;
  // Barra formato inválido antes de ir ao banco: economiza a consulta e mantém
  // o parâmetro dentro do alfabeto que o gerador de slug produz.
  if (!slug || !SLUG_VALIDO.test(slug)) {
    return Response.json({ error: "slug obrigatório" }, { status: 400 });
  }

  const [article] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);

  if (!article) {
    return Response.json({ error: "não encontrado" }, { status: 404 });
  }

  await db
    .insert(articleViews)
    .values({ articleId: article.id, day: todayInFortaleza(), count: 1 })
    .onConflictDoUpdate({
      target: [articleViews.articleId, articleViews.day],
      set: { count: sql`${articleViews.count} + 1` },
    });

  return new Response(null, { status: 204 });
}
