import { classifyCategory } from "../core/category";
import { fetchText } from "../core/http";
import { parseNewsSitemap } from "../core/rss";
import { removeAccents } from "../core/text";
import type { NewsSource, RawArticle } from "../types";

// News-sitemap (protocolo Google News) da editoria Jogada — cobre todo o
// esporte cearense, então filtramos itens sobre o Fortaleza.
const FEED_URL = "https://diariodonordeste.verdesmares.com.br/cmlink/feed-7.4674196";

function isAboutFortaleza(title: string, url: string): boolean {
  // O feed cobre o site inteiro: restringe à editoria de esportes (/jogada/)
  // para não capturar notícias da CIDADE de Fortaleza.
  if (!new URL(url).pathname.startsWith("/jogada/")) return false;
  const haystack = removeAccents(`${title} ${url}`).toLowerCase();
  return (
    haystack.includes("fortaleza") ||
    haystack.includes("leao do pici") ||
    haystack.includes("tricolor do pici")
  );
}

export const diarioDoNordeste: NewsSource = {
  slug: "diario-do-nordeste",
  name: "Diário do Nordeste",
  baseUrl: "https://diariodonordeste.verdesmares.com.br",

  async fetchLatest(): Promise<RawArticle[]> {
    const xml = await fetchText(FEED_URL);
    return parseNewsSitemap(xml)
      .filter((item) => isAboutFortaleza(item.title, item.loc))
      .slice(0, 20)
      .map((item) => ({
        title: item.title,
        originalUrl: item.loc,
        excerpt: null, // enriquecido via og:description apenas para itens novos
        imageUrl: item.imageUrl,
        category: classifyCategory(item.title),
        publishedAt: item.publishedAt,
      }));
  },
};
