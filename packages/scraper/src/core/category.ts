import { removeAccents } from "./text";

const rules: Array<{ category: string; keywords: string[] }> = [
  {
    category: "Mercado da Bola",
    keywords: [
      "mercado",
      "contrat",
      "negoci",
      "reforc",
      "rescis",
      "emprest",
      "proposta",
      "sondagem",
    ],
  },
  {
    category: "Base",
    keywords: ["sub-15", "sub-17", "sub-20", "sub 20", "base do", "categorias de base"],
  },
  { category: "Feminino", keywords: ["feminino", "feminina", "leoas"] },
  { category: "Copa do Nordeste", keywords: ["copa do nordeste", "lampions"] },
  { category: "Copa do Brasil", keywords: ["copa do brasil"] },
  { category: "Libertadores", keywords: ["libertadores"] },
  { category: "Sul-Americana", keywords: ["sul-americana", "sulamericana"] },
  { category: "Brasileirão", keywords: ["brasileirao", "serie a", "serie b", "rodada"] },
];

export function classifyCategory(title: string, fallback: string | null = null): string | null {
  const normalized = removeAccents(title).toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category;
    }
  }
  return fallback;
}
