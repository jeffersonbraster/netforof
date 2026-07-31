import { eq, sql } from "@netfor/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";

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
 * Duas camadas: origem (higiene, barra abuso trivial de fora) e rate limit por
 * IP (o teto de verdade, que vale mesmo para quem forja os cabeçalhos).
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

/**
 * Teto por IP. `cf-connecting-ip` é preenchido pela Cloudflare e não é forjável
 * pelo cliente — ao contrário de `x-forwarded-for`, que qualquer um manda.
 *
 * O contador da Cloudflare é aproximado: sob concorrência ele fica atrás, e uma
 * rajada passa do teto antes de começar a barrar (medido em produção: 40
 * simultâneas com limite de 20/min deixaram 35 passar). Serve para conter abuso
 * sustentado, não como corte exato.
 *
 * Falso positivo é aceitável aqui: atrás de CGNAT de operadora móvel muita gente
 * divide o mesmo IP, mas o custo é uma leitura não contabilizada — o ViewTracker
 * ignora erro em silêncio e nada na navegação quebra.
 *
 * Se o binding não existir (dev local sem proxy), libera: o contador é métrica
 * best-effort, não vale derrubar a rota por causa dele.
 */
async function dentroDoLimite(request: Request): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return true;

  try {
    const { env } = getCloudflareContext();
    const limitador = env.VIEWS_RATE_LIMITER;
    if (!limitador) return true;
    const { success } = await limitador.limit({ key: ip });
    return success;
  } catch {
    return true;
  }
}

export async function POST(request: Request) {
  if (!veioDoProprioSite(request)) {
    return Response.json({ error: "origem inválida" }, { status: 403 });
  }

  if (!(await dentroDoLimite(request))) {
    return Response.json({ error: "muitas requisições" }, { status: 429 });
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
