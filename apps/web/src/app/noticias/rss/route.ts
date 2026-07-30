import { getArticlesPage } from "@/modules/news/queries";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const { items } = await getArticlesPage({ page: 1, category: null, sourceSlug: null });

  const rssItems = items
    .map(
      (article) => `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${SITE_URL}/noticias/${article.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/noticias/${article.slug}</guid>
      <description>${escapeXml(`${article.excerpt} (Fonte: ${article.sourceName})`)}</description>
      <pubDate>${article.publishedAt.toUTCString()}</pubDate>
      ${article.category ? `<category>${escapeXml(article.category)}</category>` : ""}
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} — Notícias do Fortaleza EC</title>
    <link>${SITE_URL}</link>
    <atom:link href="${SITE_URL}/noticias/rss" rel="self" type="application/rss+xml" />
    <description>Todas as notícias do Leão em um só lugar, agregadas dos principais portais.</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItems}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=600",
    },
  });
}
