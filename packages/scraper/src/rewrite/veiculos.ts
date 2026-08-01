/**
 * Trava de menção a veículos.
 *
 * A instrução do sistema já proíbe citar imprensa, mas instrução não é garantia:
 * o modelo escorrega quando o material original repete "segundo o jornal X" em
 * todo parágrafo. Esta é a verificação determinística depois da geração.
 *
 * Cobre os veículos que coletamos e as formas curtas pelas quais são chamados.
 */
const VEICULOS_PROIBIDOS = [
  "globo esporte",
  "globoesporte",
  "ge.globo",
  "sportv",
  "premiere",
  "sou fortaleza",
  "soufortaleza",
  "diário do nordeste",
  "diario do nordeste",
  "verdesmares",
  "verdes mares",
  "o povo",
  "opovo",
  "espn",
  "lance!",
  "lance net",
  "goal.com",
  "trivela",
  "gcmais",
  "gc mais",
  "uol",
  "band",
  "sbt",
  "record",
  "cnn brasil",
  "itatiaia",
  "gazeta esportiva",
];

export interface MencaoDeVeiculo {
  limpo: boolean;
  encontrados: string[];
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function checarMencaoDeVeiculo(...partes: string[]): MencaoDeVeiculo {
  const alvo = normalizar(partes.join(" \n "));
  const encontrados = VEICULOS_PROIBIDOS.filter((v) => alvo.includes(normalizar(v)));
  return { limpo: encontrados.length === 0, encontrados };
}
