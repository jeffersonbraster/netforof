import type { MetadataRoute } from "next";

import { desc, articles, chants } from "@netfor/db";

import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [latestArticle] = await db
    .select({ scrapedAt: articles.scrapedAt })
    .from(articles)
    .orderBy(desc(articles.scrapedAt))
    .limit(1);

  const allChants = await db.select({ slug: chants.slug }).from(chants);

  const lastNews = latestArticle?.scrapedAt ?? new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: lastNews, changeFrequency: "hourly", priority: 1 },
    {
      url: `${SITE_URL}/noticias`,
      lastModified: lastNews,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    { url: `${SITE_URL}/agenda`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/classificacao`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/videos`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/cantos-da-torcida`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/sobre`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const chantPages: MetadataRoute.Sitemap = allChants.map((chant) => ({
    url: `${SITE_URL}/cantos-da-torcida/${chant.slug}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  // Páginas de artigo (Modo A) são noindex — ficam fora do sitemap de propósito.
  return [...staticPages, ...chantPages];
}
