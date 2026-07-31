import * as cheerio from "cheerio";

import { classifyCategory } from "../core/category";
import { fetchText } from "../core/http";
import { parseNewsSitemap } from "../core/rss";
import { removeAccents } from "../core/text";
import type { NewsSource, RawArticle } from "../types";

// O único feed do portal é o news-sitemap do site INTEIRO (janela curta, ~30
// itens de todas as editorias), então em muitas rodadas ele não traz nenhuma
// matéria do Leão. Combinamos com a capa da editoria Jogada, que lista dezenas
// de matérias de esporte e é onde o conteúdo do Fortaleza realmente aparece.
const FEED_URL = "https://diariodonordeste.verdesmares.com.br/cmlink/feed-7.4674196";
const SECTION_URL = "https://diariodonordeste.verdesmares.com.br/jogada";

// Matérias do portal terminam em "-1.<id>" (Escenic).
const ARTICLE_PATTERN = /\/jogada\/[^"?#]+-1\.\d+$/;

function isAboutFortaleza(title: string, url: string): boolean {
  // Restringe à editoria de esportes (/jogada/) para não capturar notícias da
  // CIDADE de Fortaleza (polícia, cultura, trânsito...).
  if (!new URL(url, SECTION_URL).pathname.startsWith("/jogada/")) return false;
  const haystack = removeAccents(decodeURIComponent(`${title} ${url}`)).toLowerCase();
  return (
    haystack.includes("fortaleza") ||
    haystack.includes("leao do pici") ||
    haystack.includes("tricolor do pici")
  );
}

async function fromSitemap(): Promise<RawArticle[]> {
  const xml = await fetchText(FEED_URL);
  return parseNewsSitemap(xml)
    .filter((item) => isAboutFortaleza(item.title, item.loc))
    .map((item) => ({
      title: item.title,
      originalUrl: item.loc,
      excerpt: null, // enriquecido via og:description apenas para itens novos
      imageUrl: item.imageUrl,
      category: classifyCategory(item.title),
      publishedAt: item.publishedAt,
    }));
}

async function fromSection(): Promise<RawArticle[]> {
  const html = await fetchText(SECTION_URL);
  const $ = cheerio.load(html);
  const byUrl = new Map<string, RawArticle>();

  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr("href")?.trim();
    if (!href || !ARTICLE_PATTERN.test(href)) return;

    const url = new URL(href, SECTION_URL).toString();

    // Cada matéria aparece em vários anchors: imagem (sem texto), título e
    // subtítulo. Só o título vive dentro de um heading — usar o texto solto do
    // anchor traria o subtítulo ("A suspensão se deve a...") como manchete.
    const heading = anchor.find("h1,h2,h3,h4,h5,h6").first().text();
    const title = (anchor.attr("title") ?? heading).replace(/\s+/g, " ").trim();
    if (!title || byUrl.has(url) || !isAboutFortaleza(title, url)) return;

    byUrl.set(url, {
      title,
      originalUrl: url,
      excerpt: null,
      imageUrl: null,
      category: classifyCategory(title),
      // A capa não expõe data: null faz o pipeline buscar article:published_time.
      publishedAt: null,
    });
  });

  return [...byUrl.values()];
}

export const diarioDoNordeste: NewsSource = {
  slug: "diario-do-nordeste",
  name: "Diário do Nordeste",
  baseUrl: "https://diariodonordeste.verdesmares.com.br",

  async fetchLatest(): Promise<RawArticle[]> {
    const [sitemap, section] = await Promise.all([fromSitemap(), fromSection()]);

    // O sitemap traz data real de publicação — tem prioridade sobre a capa.
    const byUrl = new Map<string, RawArticle>();
    for (const article of [...section, ...sitemap]) {
      byUrl.set(article.originalUrl, article);
    }

    return [...byUrl.values()].slice(0, 20);
  },
};
