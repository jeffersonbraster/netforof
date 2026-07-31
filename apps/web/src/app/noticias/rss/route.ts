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

/**
 * Feed RSS do portal.
 *
 * `dc:creator` traz o veículo de origem, não o NETFOR: no Modo A a autoria é de
 * quem apurou, e o feed precisa dizer isso tão explicitamente quanto a página.
 *
 * Atenção antes de mandar este feed para o Google News: os <link> apontam para
 * páginas `noindex` (Modo A). Enquanto for assim, não há o que o Google News
 * possa veicular — ver a seção correspondente no README.
 */
export async function GET() {
  const { items } = await getArticlesPage({ page: 1, category: null, sourceSlug: null });

  const rssItems = items
    .map(
      (article) => `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${SITE_URL}/noticias/${article.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/noticias/${article.slug}</guid>
      <description>${escapeXml(`${article.excerpt} (Fonte: ${article.sourceName})`)}</description>
      <dc:creator>${escapeXml(article.sourceName)}</dc:creator>
      <pubDate>${article.publishedAt.toUTCString()}</pubDate>
      ${article.category ? `<category>${escapeXml(article.category)}</category>` : ""}
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
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
