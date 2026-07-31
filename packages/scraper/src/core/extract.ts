import * as cheerio from "cheerio";

import { fetchText } from "./http";

/**
 * Extrai o texto corrido da matéria original.
 *
 * ATENÇÃO — este texto é INSUMO, não conteúdo. Ele entra na reescrita e é
 * descartado na memória; nunca vai para o banco nem para a página. É o que
 * separa "apurar sobre a notícia" de "republicar a notícia alheia".
 */

/** Ruído que aparece dentro do corpo em quase todo portal. */
const SELETORES_DESCARTE = [
  "script",
  "style",
  "noscript",
  "iframe",
  "figure",
  "figcaption",
  "aside",
  "nav",
  "header",
  "footer",
  "form",
  ".ad",
  ".ads",
  ".advertisement",
  ".publicidade",
  ".newsletter",
  ".related",
  ".relacionadas",
  ".share",
  ".compartilhar",
  ".breadcrumb",
  ".tags",
  ".comments",
  ".comentarios",
  "[class*='banner']",
  "[class*='publicidade']",
  "[id*='banner']",
].join(",");

/** Onde o corpo costuma estar, do mais específico para o mais genérico. */
const SELETORES_CORPO = [
  "article [itemprop='articleBody']",
  "[itemprop='articleBody']",
  "article .content-text",
  "article .entry-content",
  "article .post-content",
  ".content-text",
  ".entry-content",
  ".post-content",
  ".article-body",
  "article",
  "main",
];

/** Linhas que são chamada, assinatura ou rodapé — não fazem parte da notícia. */
function ehRuido(linha: string): boolean {
  const l = linha.toLowerCase();
  return (
    linha.length < 40 ||
    /^(leia (mais|também)|veja (mais|também)|assista|siga|compartilh|publicidade|continua após|foto:|imagem:|crédito:|fonte:|por\s+\w+\s*[—-])/i.test(
      linha,
    ) ||
    /(newsletter|assine|cadastre-se|todos os direitos reservados|©)/i.test(l)
  );
}

export interface TextoOriginal {
  texto: string;
  paragrafos: number;
}

export async function extractArticleText(url: string): Promise<TextoOriginal | null> {
  let html: string;
  try {
    html = await fetchText(url);
  } catch {
    return null;
  }

  const $ = cheerio.load(html);
  $(SELETORES_DESCARTE).remove();

  for (const seletor of SELETORES_CORPO) {
    const bloco = $(seletor).first();
    if (bloco.length === 0) continue;

    const paragrafos = bloco
      .find("p")
      .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
      .get()
      .filter((p) => !ehRuido(p));

    // Menos de 3 parágrafos quase sempre significa que pegamos o bloco errado
    // (chamada, sidebar) — vale tentar o próximo seletor.
    if (paragrafos.length >= 3) {
      return { texto: paragrafos.join("\n\n"), paragrafos: paragrafos.length };
    }
  }

  return null;
}
