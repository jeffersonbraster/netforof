import * as cheerio from "cheerio";

import { classifyCategory } from "../core/category";
import { fetchText } from "../core/http";
import type { NewsSource, RawArticle } from "../types";

const PAGE_URL = "https://www.opovo.com.br/esportes/futebol/times/fortaleza/";
// Matérias têm URL /times/fortaleza/AAAA/MM/DD/slug.html
const ARTICLE_PATTERN = /\/esportes\/futebol\/times\/fortaleza\/(\d{4})\/(\d{2})\/(\d{2})\/[^"?#]+\.html$/;

export const oPovo: NewsSource = {
  slug: "opovo",
  name: "O Povo",
  baseUrl: PAGE_URL,

  async fetchLatest(): Promise<RawArticle[]> {
    const html = await fetchText(PAGE_URL);
    const $ = cheerio.load(html);
    const byUrl = new Map<string, RawArticle>();

    $("a[href]").each((_, element) => {
      const anchor = $(element);
      const href = anchor.attr("href")?.trim();
      if (!href) return;
      const match = ARTICLE_PATTERN.exec(href);
      if (!match) return;

      const title = anchor.attr("title")?.trim() || anchor.text().replace(/\s+/g, " ").trim();
      // Anchors de imagem vêm sem texto; o de título sobrescreve depois
      const existing = byUrl.get(href);
      if (existing && existing.title.length >= title.length) return;
      if (!title) return;

      const [, year, month, day] = match;
      byUrl.set(href, {
        title,
        originalUrl: href,
        excerpt: null, // og:description preenche p/ itens novos
        imageUrl: null,
        category: classifyCategory(title),
        publishedAt: new Date(`${year}-${month}-${day}T12:00:00-03:00`),
      });
    });

    return [...byUrl.values()].slice(0, 20);
  },
};
