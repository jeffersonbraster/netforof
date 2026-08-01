import { inArray } from "drizzle-orm";
import { articles, sources, type Db } from "@netfor/db";

import type { NewsSource, RawArticle, SourceRunSummary } from "../types";
import { fetchOgMeta } from "./enrich";
import { isAllowedByRobots } from "./robots";
import { contentHash, slugify, truncate } from "./text";

const MAX_ENRICH_PER_RUN = 10;

async function ensureSource(db: Db, source: NewsSource): Promise<number> {
  const [row] = await db
    .insert(sources)
    .values({ name: source.name, slug: source.slug, baseUrl: source.baseUrl })
    .onConflictDoNothing({ target: sources.slug })
    .returning({ id: sources.id });
  if (row) return row.id;

  const existing = await db.query.sources.findFirst({
    where: (s, { eq }) => eq(s.slug, source.slug),
  });
  if (!existing) throw new Error(`Source ${source.slug} não encontrada após upsert`);
  return existing.id;
}

async function uniqueSlug(db: Db, title: string, hash: string): Promise<string> {
  const base = slugify(title);
  const existing = await db.query.articles.findFirst({
    where: (a, { eq }) => eq(a.slug, base),
    columns: { id: true },
  });
  return existing ? `${base}-${hash.slice(0, 6)}` : base;
}

export async function runSource(db: Db, source: NewsSource): Promise<SourceRunSummary> {
  const summary: SourceRunSummary = {
    source: source.slug,
    fetched: 0,
    inserted: 0,
    duplicates: 0,
    error: null,
  };

  const items = await source.fetchLatest();
  summary.fetched = items.length;
  if (items.length === 0) {
    // Alerta do plano (seção 11): adapter retornando 0 itens indica mudança no portal.
    console.warn(`⚠️  [${source.slug}] retornou 0 itens — verificar se o portal mudou.`);
    return summary;
  }

  const sourceId = await ensureSource(db, source);

  // Nível 1 do dedupe: originalUrl já existente no banco
  const existingUrls = await db
    .select({ url: articles.originalUrl })
    .from(articles)
    .where(
      inArray(
        articles.originalUrl,
        items.map((item) => item.originalUrl),
      ),
    );
  const known = new Set(existingUrls.map((row) => row.url));
  const fresh = items.filter((item) => !known.has(item.originalUrl));
  summary.duplicates = items.length - fresh.length;

  let enriched = 0;
  for (const item of fresh) {
    if (!(await isAllowedByRobots(item.originalUrl))) {
      console.warn(`   [${source.slug}] bloqueado por robots.txt: ${item.originalUrl}`);
      continue;
    }

    // Enriquecimento (og:) só para itens novos sem excerpt/imagem/data
    let { excerpt, imageUrl, publishedAt } = item;
    if ((!excerpt || !imageUrl || !publishedAt) && enriched < MAX_ENRICH_PER_RUN) {
      enriched++;
      const meta = await fetchOgMeta(item.originalUrl);
      excerpt = excerpt ?? meta.description;
      imageUrl = imageUrl ?? meta.imageUrl;
      publishedAt = publishedAt ?? meta.publishedAt;
    }

    const hash = contentHash(item.title);
    const slug = await uniqueSlug(db, item.title, hash);

    const inserted = await db
      .insert(articles)
      .values({
        sourceId,
        title: truncate(item.title, 200),
        slug,
        excerpt: excerpt ?? truncate(item.title, 200),
        originalUrl: item.originalUrl,
        imageUrl,
        category: item.category,
        publishedAt: publishedAt ?? new Date(),
        contentHash: hash,
        // Nasce como rascunho: no Modo B a matéria só vai ao ar com texto
        // próprio, depois da reescrita e da revisão. Publicar direto colocaria
        // resumo de terceiro numa página indexável — exatamente o que o Modo B
        // existe para evitar.
        status: "draft" as const,
      })
      .onConflictDoNothing({ target: articles.originalUrl })
      .returning({ id: articles.id });

    if (inserted.length > 0) {
      summary.inserted++;
    } else {
      summary.duplicates++;
    }
  }

  return summary;
}
