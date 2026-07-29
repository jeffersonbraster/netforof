import * as cheerio from "cheerio";

import { fetchText } from "./http";
import { stripHtml, truncate } from "./text";

export interface OgMeta {
  description: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
}

/**
 * Busca metadados Open Graph da página da matéria — usado apenas para artigos
 * NOVOS cujo adapter não fornece excerpt/imagem (news-sitemap e listagens HTML).
 */
export async function fetchOgMeta(url: string): Promise<OgMeta> {
  try {
    const html = await fetchText(url);
    const $ = cheerio.load(html);

    const description =
      $('meta[property="og:description"]').attr("content") ??
      $('meta[name="description"]').attr("content") ??
      null;

    const imageUrl = $('meta[property="og:image"]').attr("content") ?? null;

    const publishedRaw =
      $('meta[property="article:published_time"]').attr("content") ??
      $("time[datetime]").first().attr("datetime") ??
      null;
    const published = publishedRaw ? new Date(publishedRaw) : null;

    return {
      description: description ? truncate(stripHtml(description), 300) : null,
      imageUrl,
      publishedAt: published && !Number.isNaN(published.getTime()) ? published : null,
    };
  } catch {
    return { description: null, imageUrl: null, publishedAt: null };
  }
}
