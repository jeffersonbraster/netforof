import { classifyCategory } from "../core/category";
import { fetchText } from "../core/http";
import { parseRss } from "../core/rss";
import type { NewsSource, RawArticle } from "../types";

const FEED_URL = "https://soufortaleza.com/feed/";

export const souFortaleza: NewsSource = {
  slug: "sou-fortaleza",
  name: "Sou Fortaleza",
  baseUrl: "https://soufortaleza.com",

  async fetchLatest(): Promise<RawArticle[]> {
    const xml = await fetchText(FEED_URL);
    return parseRss(xml).map((item) => ({
      title: item.title,
      originalUrl: item.link,
      excerpt: item.description,
      imageUrl: item.imageUrl,
      category: item.categories[0] ?? classifyCategory(item.title),
      publishedAt: item.publishedAt,
    }));
  },
};
