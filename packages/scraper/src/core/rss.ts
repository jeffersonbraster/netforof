import { XMLParser } from "fast-xml-parser";

import { stripHtml, truncate } from "./text";

export interface RssItem {
  title: string;
  link: string;
  description: string | null;
  imageUrl: string | null;
  categories: string[];
  publishedAt: Date | null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "#text" in value) {
    return String((value as Record<string, unknown>)["#text"]);
  }
  return "";
}

function firstImageFromHtml(html: string): string | null {
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return match?.[1] ?? null;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Parser de RSS 2.0 (WordPress e afins). */
export function parseRss(xml: string): RssItem[] {
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel ?? doc?.channel;
  if (!channel) return [];

  return toArray<Record<string, unknown>>(channel.item).flatMap((item) => {
    const title = stripHtml(textOf(item.title));
    const link = textOf(item.link).trim();
    if (!title || !link) return [];

    const contentEncoded = textOf(item["content:encoded"]);
    const description = textOf(item.description);
    const mediaContent = toArray<Record<string, unknown>>(
      item["media:content"] as Record<string, unknown> | Record<string, unknown>[] | undefined,
    );
    const enclosure = item.enclosure as Record<string, unknown> | undefined;

    const imageUrl =
      (mediaContent[0]?.["@_url"] as string | undefined) ??
      (enclosure?.["@_type"]?.toString().startsWith("image")
        ? (enclosure?.["@_url"] as string | undefined)
        : undefined) ??
      firstImageFromHtml(contentEncoded || description) ??
      null;

    const categories = toArray(item.category)
      .map((c) => stripHtml(textOf(c)))
      .filter(Boolean);

    const pubDate = textOf(item.pubDate) || textOf(item["dc:date"]);

    return [
      {
        title,
        link,
        description: description ? truncate(stripHtml(description), 300) : null,
        imageUrl,
        categories,
        publishedAt: pubDate ? parseDate(pubDate) : null,
      },
    ];
  });
}

export interface NewsSitemapItem {
  title: string;
  loc: string;
  imageUrl: string | null;
  publishedAt: Date | null;
}

/** Parser de news-sitemap (protocolo Google News — usado pelo Diário do Nordeste). */
export function parseNewsSitemap(xml: string): NewsSitemapItem[] {
  const doc = parser.parse(xml);
  const urls = toArray<Record<string, unknown>>(doc?.urlset?.url);

  return urls.flatMap((url) => {
    const loc = textOf(url.loc).trim();
    const news = url["news:news"] as Record<string, unknown> | undefined;
    const title = stripHtml(textOf(news?.["news:title"] ?? ""));
    if (!loc || !title) return [];

    const image = url["image:image"] as Record<string, unknown> | undefined;
    const published = textOf(news?.["news:publication_date"] ?? "") || textOf(url.lastmod ?? "");

    return [
      {
        title,
        loc,
        imageUrl: image ? textOf(image["image:loc"]).trim() || null : null,
        publishedAt: published ? parseDate(published) : null,
      },
    ];
  });
}
