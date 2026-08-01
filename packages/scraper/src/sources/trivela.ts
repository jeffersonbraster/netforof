import { classifyCategory } from "../core/category";
import { fetchText } from "../core/http";
import { ehDoClube } from "../core/pertinencia";
import { parseRss } from "../core/rss";
import type { NewsSource, RawArticle } from "../types";

const FEED_URL = "https://trivela.com.br/feed/";

/**
 * Trivela cobre futebol mundial: o feed traz muito mais coisa do que Fortaleza.
 * O filtro de pertinência é obrigatório aqui, não opcional.
 */
export const trivela: NewsSource = {
  slug: "trivela",
  name: "Trivela",
  baseUrl: "https://trivela.com.br",

  async fetchLatest(): Promise<RawArticle[]> {
    const xml = await fetchText(FEED_URL);
    return parseRss(xml)
      .filter((item) => ehDoClube(item.title, item.link, item.description ?? ""))
      .map((item) => ({
        title: item.title,
        originalUrl: item.link,
        excerpt: item.description,
        imageUrl: item.imageUrl,
        category: item.categories[0] ?? classifyCategory(item.title),
        publishedAt: item.publishedAt,
      }));
  },
};
