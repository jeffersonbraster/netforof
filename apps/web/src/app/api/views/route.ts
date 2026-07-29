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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { slug?: unknown };
  const slug = typeof body.slug === "string" ? body.slug : null;
  if (!slug) {
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
