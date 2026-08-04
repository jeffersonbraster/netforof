import { classifyCategory } from "../core/category";
import { ESPN_API } from "../core/espn";
import { fetchJson } from "../core/http";
import { stripHtml, truncate } from "../core/text";
import type { NewsSource, RawArticle } from "../types";

// API pública (não documentada) da ESPN — mesma que alimenta o site.
const API_URL =
  `${ESPN_API}/apis/site/v2/sports/soccer/all/news?team=6272&lang=pt&region=br`;

interface EspnArticle {
  headline?: string;
  description?: string;
  published?: string;
  type?: string;
  links?: { web?: { href?: string } };
  images?: Array<{ url?: string }>;
}

interface EspnNewsResponse {
  articles?: EspnArticle[];
}

export const espn: NewsSource = {
  slug: "espn",
  name: "ESPN Brasil",
  baseUrl: "https://www.espn.com.br/futebol/time/_/id/6272/fortaleza",

  async fetchLatest(): Promise<RawArticle[]> {
    const data = await fetchJson<EspnNewsResponse>(API_URL);
    return (data.articles ?? []).flatMap((article) => {
      const title = article.headline?.trim();
      const url = article.links?.web?.href?.trim();
      if (!title || !url || !url.includes("espn.com")) return [];

      const published = article.published ? new Date(article.published) : null;

      return [
        {
          title,
          originalUrl: url,
          excerpt: article.description ? truncate(stripHtml(article.description), 300) : null,
          imageUrl: article.images?.[0]?.url ?? null,
          category: classifyCategory(title),
          publishedAt: published && !Number.isNaN(published.getTime()) ? published : null,
        },
      ];
    });
  },
};
