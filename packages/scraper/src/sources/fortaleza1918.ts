/**
 * Site oficial do clube. `fortalezaec.net` é a mesma publicação — o feed de lá
 * devolve links para fortaleza1918.com.br. Adicionar as duas gera 100% de
 * duplicata.
 */
import { classifyCategory } from "../core/category";
import { fetchText } from "../core/http";
import { parseRss } from "../core/rss";
import type { NewsSource, RawArticle } from "../types";

const FEED_URL = "https://www.fortaleza1918.com.br/feed/";

export const fortaleza1918: NewsSource = {
  slug: "fortaleza1918",
  name: "Fortaleza EC",
  baseUrl: "https://www.fortaleza1918.com.br",

  async fetchLatest(): Promise<RawArticle[]> {
    const xml = await fetchText(FEED_URL);
    return parseRss(xml).map((item) => ({
      title: item.title,
      originalUrl: item.link,
      excerpt: item.description,
      imageUrl: item.imageUrl,
      category: item.categories[0] ?? classifyCategory(item.title, "Clube"),
      publishedAt: item.publishedAt,
    }));
  },
};
