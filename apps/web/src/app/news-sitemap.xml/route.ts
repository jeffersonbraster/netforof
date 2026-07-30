import { and, desc, eq, gte, articles, sources } from "@netfor/db";

import { db } from "@/lib/db";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * News-sitemap (protocolo Google News): últimas 48h.
 * Nota Modo A: as páginas de artigo são noindex, então este sitemap só passa a
 * ter efeito quando o Modo B (conteúdo próprio indexável) for ativado — já fica
 * pronto para isso.
 */
export async function GET() {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const rows = await db
    .select({
      slug: articles.slug,
      title: articles.title,
      publishedAt: articles.publishedAt,
      sourceName: sources.name,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(and(eq(articles.status, "published"), gte(articles.publishedAt, since)))
    .orderBy(desc(articles.publishedAt))
    .limit(100);

  const urls = rows
    .map(
      (row) => `  <url>
    <loc>${SITE_URL}/noticias/${row.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>${SITE_NAME}</news:name>
        <news:language>pt-BR</news:language>
      </news:publication>
      <news:publication_date>${row.publishedAt.toISOString()}</news:publication_date>
      <news:title>${escapeXml(row.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=600",
    },
  });
}
