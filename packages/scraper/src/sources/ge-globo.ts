import * as cheerio from "cheerio";

import { classifyCategory } from "../core/category";
import { fetchText } from "../core/http";
import type { NewsSource, RawArticle } from "../types";

const PAGE_URL = "https://ge.globo.com/ce/futebol/times/fortaleza/";

export const geGlobo: NewsSource = {
  slug: "ge",
  name: "ge",
  baseUrl: PAGE_URL,

  async fetchLatest(): Promise<RawArticle[]> {
    const html = await fetchText(PAGE_URL);
    const $ = cheerio.load(html);
    const articles: RawArticle[] = [];
    const seen = new Set<string>();

    $(".feed-post").each((_, element) => {
      const post = $(element);
      const link = post.find("a.feed-post-link").first();
      const href = link.attr("href")?.trim();
      const title = link.text().trim();
      if (!href || !title || seen.has(href)) return;
      // Só matérias do próprio ge (o feed injeta cards de outros produtos Globo)
      if (!href.startsWith("https://ge.globo.com/")) return;
      seen.add(href);

      const excerpt = post.find(".feed-post-body-resumo").first().text().trim() || null;
      const imageUrl =
        post.find("img.bstn-fd-picture-image").first().attr("src") ??
        post.find("img").first().attr("src") ??
        null;

      articles.push({
        title,
        originalUrl: href,
        excerpt,
        imageUrl,
        category: classifyCategory(title),
        publishedAt: null, // página só traz tempo relativo; og meta preenche p/ novos
      });
    });

    return articles.slice(0, 20);
  },
};
