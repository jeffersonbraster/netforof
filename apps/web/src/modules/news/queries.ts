import { and, count, desc, eq, gte, isNotNull, ne, sql } from "@netfor/db";
import { cacheLife, cacheTag } from "next/cache";

import { articles, articleViews, sources } from "@netfor/db";

import { db } from "@/lib/db";
import type { ArticleCard, ArticleDetail, NewsFilters } from "./types";

const cardColumns = {
  id: articles.id,
  title: articles.title,
  slug: articles.slug,
  excerpt: articles.excerpt,
  imageUrl: articles.imageUrl,
  category: articles.category,
  sourceName: sources.name,
  publishedAt: articles.publishedAt,
};

/**
 * Dedupe de exibição (nível 2 do plano): mantém só a matéria mais recente de
 * cada contentHash — a cobertura repetida vira "cobertura relacionada".
 */
function dedupeByHash<T extends { id: number }>(rows: (T & { contentHash: string })[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const row of rows) {
    if (seen.has(row.contentHash)) continue;
    seen.add(row.contentHash);
    result.push(row);
  }
  return result;
}

export async function getHomeArticles(): Promise<{
  hero: ArticleCard | null;
  secondary: ArticleCard[];
  latest: ArticleCard[];
}> {
  "use cache";
  cacheTag("articles");
  cacheLife("days");

  const rows = await db
    .select({ ...cardColumns, contentHash: articles.contentHash })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
    .limit(60);

  const deduped = dedupeByHash(rows);
  const heroIndex = Math.max(
    0,
    deduped.findIndex((a) => a.imageUrl !== null),
  );
  const hero = deduped[heroIndex] ?? null;
  const rest = deduped.filter((_, index) => index !== heroIndex);

  return {
    hero,
    secondary: rest.slice(0, 4),
    latest: rest.slice(4, 12),
  };
}

export interface ArticlesPageParams {
  page: number;
  category: string | null;
  sourceSlug: string | null;
}

export async function getArticlesPage({ page, category, sourceSlug }: ArticlesPageParams): Promise<{
  items: ArticleCard[];
  total: number;
  pageSize: number;
}> {
  "use cache";
  cacheTag("articles");
  cacheLife("days");

  const pageSize = 12;
  const conditions = [eq(articles.status, "published")];
  if (category) conditions.push(eq(articles.category, category));
  if (sourceSlug) conditions.push(eq(sources.slug, sourceSlug));
  const where = and(...conditions);

  const [items, [totalRow]] = await Promise.all([
    db
      .select(cardColumns)
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(where)
      .orderBy(desc(articles.publishedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(where),
  ]);

  return { items, total: totalRow?.value ?? 0, pageSize };
}

export async function getNewsFilters(): Promise<NewsFilters> {
  "use cache";
  cacheTag("articles");
  cacheLife("days");

  const [categoryRows, sourceRows] = await Promise.all([
    db
      .selectDistinct({ category: articles.category })
      .from(articles)
      .where(and(eq(articles.status, "published"), isNotNull(articles.category))),
    db
      .select({ slug: sources.slug, name: sources.name })
      .from(sources)
      .where(eq(sources.active, true))
      .orderBy(sources.name),
  ]);

  return {
    categories: categoryRows
      .map((row) => row.category)
      .filter((c): c is string => c !== null)
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
    sources: sourceRows,
  };
}

/**
 * Slugs publicados, numa única entrada de cache. Serve de porteiro para
 * `getArticleBySlug`: o argumento dela entra na chave do cache, então cada slug
 * inexistente que um crawler inventa viraria uma entrada nova no KV — espaço de
 * chave infinito, com o agravante de que o `null` do resultado também é
 * cacheado. Conferindo aqui primeiro, URL inválida vira 404 sem escrever nada.
 */
export async function getPublishedSlugs(): Promise<string[]> {
  "use cache";
  cacheTag("articles");
  cacheLife("days");

  const rows = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(eq(articles.status, "published"));

  return rows.map((row) => row.slug);
}

/**
 * Porteiro de `getArticleDetail`: confere o slug contra a lista publicada antes
 * de deixar o argumento virar chave de cache. Sem isso, `/noticias/qualquer-lixo`
 * cria entrada nova no KV a cada URL inventada.
 */
export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const publicados = await getPublishedSlugs();
  if (!publicados.includes(slug)) return null;
  return getArticleDetail(slug);
}

/**
 * Só a tag do próprio slug — nada de `articles`. A matéria é imutável depois de
 * inserida (o pipeline usa onConflictDoNothing), então incluí-la na tag de lista
 * fazia cada notícia nova invalidar todas as páginas de matéria de uma vez: era
 * o maior multiplicador de escrita no KV. O que envelhece aqui é só o bloco de
 * cobertura relacionada, e para isso o próprio cacheLife basta.
 *
 * Já vem com o slug validado por `getArticleBySlug`. Chamar direto (sem passar
 * pelo porteiro) é proposital em escopo cacheado: `getPublishedSlugs` carrega a
 * tag `articles`, que vazaria para a entrada externa e desfaria tudo isto.
 */
export async function getArticleDetail(slug: string): Promise<ArticleDetail | null> {
  "use cache";
  cacheTag(`article-${slug}`);
  cacheLife("days");

  const [row] = await db
    .select({
      ...cardColumns,
      originalUrl: articles.originalUrl,
      sourceSlug: sources.slug,
      content: articles.content,
      contentHash: articles.contentHash,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(and(eq(articles.slug, slug), eq(articles.status, "published")))
    .limit(1);

  if (!row) return null;

  const related = await db
    .select(cardColumns)
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(
      and(
        eq(articles.contentHash, row.contentHash),
        ne(articles.id, row.id),
        eq(articles.status, "published"),
      ),
    )
    .orderBy(desc(articles.publishedAt))
    .limit(5);

  // contentHash é detalhe interno de deduplicação — não vaza para a UI.
  const { contentHash, ...article } = row;
  void contentHash;
  return { ...article, related };
}

export interface MostReadItem {
  title: string;
  slug: string;
  views: number;
}

export async function getMostReadWeek(): Promise<MostReadItem[]> {
  "use cache";
  cacheTag("articles");
  cacheLife("days");

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceDay = since.toISOString().slice(0, 10);

  const rows = await db
    .select({
      title: articles.title,
      slug: articles.slug,
      views: sql<number>`sum(${articleViews.count})`.mapWith(Number),
    })
    .from(articleViews)
    .innerJoin(articles, eq(articleViews.articleId, articles.id))
    .where(and(gte(articleViews.day, sinceDay), eq(articles.status, "published")))
    .groupBy(articles.id, articles.title, articles.slug)
    .orderBy(desc(sql`sum(${articleViews.count})`))
    .limit(5);

  if (rows.length >= 5) return rows;

  // Fallback: completa com as mais recentes enquanto não há views suficientes
  const seen = new Set(rows.map((r) => r.slug));
  const recent = await db
    .select({ title: articles.title, slug: articles.slug })
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
    .limit(10);

  const fallback = recent
    .filter((r) => !seen.has(r.slug))
    .slice(0, 5 - rows.length)
    .map((r) => ({ ...r, views: 0 }));

  return [...rows, ...fallback];
}
