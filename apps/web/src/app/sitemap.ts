import type { MetadataRoute } from "next";

import { and, desc, eq, isNotNull, articles, chants } from "@netfor/db";

import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [latestArticle] = await db
    .select({ scrapedAt: articles.scrapedAt })
    .from(articles)
    .orderBy(desc(articles.scrapedAt))
    .limit(1);

  const allChants = await db.select({ slug: chants.slug }).from(chants);

  /**
   * Só entra no sitemap matéria COM texto próprio. É a trava que impede um
   * resquício do Modo A — resumo de terceiro — de ser oferecido ao índice.
   */
  const materias = await db
    .select({ slug: articles.slug, atualizada: articles.publishedAt })
    .from(articles)
    .where(and(eq(articles.status, "published"), isNotNull(articles.content)))
    .orderBy(desc(articles.publishedAt))
    .limit(5000);

  const lastNews = latestArticle?.scrapedAt ?? new Date();

  const staticPages: MetadataRoute.Sitemap = [
    // Sem barra final: é a forma que o `alternates.canonical` da home gera. Se as
    // duas divergirem, o Search Console enxerga URL diferente da canônica.
    { url: SITE_URL, lastModified: lastNews, changeFrequency: "hourly", priority: 1 },
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
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/termos`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const chantPages: MetadataRoute.Sitemap = allChants.map((chant) => ({
    url: `${SITE_URL}/cantos-da-torcida/${chant.slug}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const materiaPages: MetadataRoute.Sitemap = materias.map((m) => ({
    url: `${SITE_URL}/noticias/${m.slug}`,
    lastModified: m.atualizada,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...chantPages, ...materiaPages];
}
