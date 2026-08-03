import type { LineupPlayer } from "@netfor/db";

/**
 * De onze jogadores para posições num campo.
 *
 * ---------------------------------------------------------------------------
 * O PROBLEMA
 * ---------------------------------------------------------------------------
 * A ESPN entrega três pistas, e nenhuma sozinha resolve:
 *
 *   `formation`       "4-3-3" — diz o formato das linhas, não quem está em cada
 *   `position`        "CD-L", "RB", "AM-R" — diz a função e o lado
 *   `formationPlace`  1 a 11 — NÃO é ordenado por profundidade
 *
 * O `formationPlace` engana. No 4-3-3 do Fortaleza contra o Palmeiras: o volante
 * era 4, os zagueiros 5 e 6, os meias 7 e 8. Distribuir os onze na ordem desse
 * número colocaria um volante na zaga e um zagueiro no meio.
 *
 * ---------------------------------------------------------------------------
 * A SOLUÇÃO
 * ---------------------------------------------------------------------------
 * Combinar as duas primeiras: a `formation` dá o TAMANHO de cada linha, e a
 * sigla de posição dá a PROFUNDIDADE de cada jogador. Ordena por profundidade,
 * corta nos tamanhos que a formação pede, e cada linha sai completa.
 *
 * Conferido contra três escalações reais da temporada:
 *
 *   4-3-3   Fortaleza × Palmeiras   → 4 zagueiros, 3 meias, 3 atacantes  ✓
 *   4-2-3-1 Fortaleza × Botafogo-SP → 4, 2 volantes, 3 meias, 1 centroavante ✓
 *   3-4-2-1 Palmeiras (mesmo jogo)  → 3, 4, 2, 1                          ✓
 */

/**
 * Profundidade por sigla, do gol para o ataque.
 *
 * Os intervalos são o que separa as linhas quando a formação tem duas faixas de
 * meio-campo: no 4-2-3-1 a ESPN chama o par de volantes de LM/RM (26) e o trio
 * ofensivo de AM (30), e é essa distância que faz o corte cair no lugar certo.
 */
const PROFUNDIDADE: Record<string, number> = {
  G: 0,
  GK: 0,
  D: 10,
  CD: 10,
  SW: 10,
  LB: 11,
  RB: 11,
  LWB: 12,
  RWB: 12,
  DM: 20,
  CM: 25,
  M: 25,
  LM: 26,
  RM: 26,
  AM: 30,
  CF: 35,
  LW: 38,
  RW: 38,
  LF: 38,
  RF: 38,
  W: 38,
  F: 40,
  ST: 40,
  CS: 40,
};

/**
 * Lado no campo, da esquerda para a direita.
 *
 * Duas fontes somadas: o prefixo (LB, RM, LF) vale 2, e o sufixo (-L, -R) vale 1.
 * É o que ordena a linha de quatro corretamente: LB (-2) · CD-L (-1) · CD-R (+1)
 * · RB (+2). Só com o sufixo, LB e CD-L empatariam e o lateral podia sair por
 * dentro do zagueiro.
 */
function lateralidade(posicao: string): number {
  const [base = "", sufixo] = posicao.toUpperCase().split("-");
  let valor = 0;
  if (base.startsWith("L")) valor -= 2;
  if (base.startsWith("R")) valor += 2;
  if (sufixo === "L") valor -= 1;
  if (sufixo === "R") valor += 1;
  return valor;
}

/**
 * A sigla é uma posição conhecida?
 *
 * Usado pelo parser do painel para separar o nome da posição no fim da linha:
 * sem essa checagem, "Lucas Sasha" perderia o "Sasha", lido como sigla.
 */
export function posicaoConhecida(sigla: string): boolean {
  const base = sigla.toUpperCase().split("-")[0] ?? "";
  return base in PROFUNDIDADE;
}

/** Todas as siglas aceitas, para montar o seletor e a ajuda do painel. */
export const SIGLAS_DE_POSICAO = Object.keys(PROFUNDIDADE);

function profundidade(posicao: string | null): number {
  if (!posicao) return 25;
  const base = posicao.toUpperCase().split("-")[0] ?? "";
  // 25 (meio-campo) é o fallback honesto para uma sigla nova: cai no miolo do
  // campo em vez de fingir que é goleiro ou centroavante.
  return PROFUNDIDADE[base] ?? 25;
}

export interface JogadorPosicionado extends LineupPlayer {
  /** 0 a 100, do próprio gol (0) ao gol adversário (100). */
  x: number;
  /** 0 a 100, da esquerda para a direita de quem ataca. */
  y: number;
}

/**
 * Lê "4-2-3-1" como [4, 2, 3, 1]. Devolve `null` se a soma não fecha 10 —
 * formação estranha não deve mandar num desenho que ela não descreve.
 */
function lerFormacao(formacao: string | null): number[] | null {
  if (!formacao) return null;
  const linhas = formacao
    .split("-")
    .map((n) => Number.parseInt(n.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (linhas.length < 2) return null;
  return linhas.reduce((soma, n) => soma + n, 0) === 10 ? linhas : null;
}

/**
 * Agrupamento de reserva, quando a formação não veio ou não fecha: quatro faixas
 * pela própria profundidade. Menos fiel ao desenho do técnico, mas nunca deixa
 * jogador de fora nem inventa linha.
 */
function agruparPorFaixa(jogadores: LineupPlayer[]): LineupPlayer[][] {
  const faixas: LineupPlayer[][] = [[], [], [], []];
  for (const jogador of jogadores) {
    const p = profundidade(jogador.posicao);
    const indice = p < 15 ? 0 : p < 28 ? 1 : p < 36 ? 2 : 3;
    faixas[indice]!.push(jogador);
  }
  return faixas.filter((faixa) => faixa.length > 0);
}

/**
 * Onde cada linha fica no eixo do ataque. Goleiro colado na trave, e não no 0.
 *
 * As linhas de campo se espalham entre 22% e 88%: sobra margem para o goleiro
 * atrás e para o nome do atacante não encostar na linha de fundo.
 *
 * O divisor é `total - 2` e não `total - 1` porque `total` conta o goleiro, que
 * não entra nesse espalhamento. Com `- 1`, um 4-3-3 parava a linha de ataque em
 * 66% e deixava um terço do campo vazio na frente.
 */
function avancoDaLinha(indice: number, total: number): number {
  if (indice === 0) return 6;
  const linhasDeCampo = total - 1;
  // Caso degenerado (uma linha só): centraliza em vez de encostar na defesa.
  if (linhasDeCampo <= 1) return 55;
  return 22 + ((88 - 22) / (linhasDeCampo - 1)) * (indice - 1);
}

/**
 * Distribui a linha na largura.
 *
 * Um só jogador vai ao centro; dois ou mais se espalham entre 15% e 85%, deixando
 * margem para o nome não encostar na lateral do campo.
 */
function espalhar(quantidade: number, indice: number): number {
  if (quantidade === 1) return 50;
  return 15 + ((85 - 15) / (quantidade - 1)) * indice;
}

/**
 * Posiciona os titulares. Devolve lista vazia quando não há onze — a página usa
 * isso para não desenhar campo pela metade.
 */
export function posicionarTitulares(
  jogadores: LineupPlayer[],
  formacao: string | null,
): JogadorPosicionado[] {
  const titulares = jogadores.filter((j) => j.titular);
  if (titulares.length === 0) return [];

  const goleiros = titulares.filter((j) => profundidade(j.posicao) === 0);
  const linha = titulares.filter((j) => profundidade(j.posicao) !== 0);

  // Ordena por profundidade; empate desempata pela casa na formação, que mantém
  // a ordem estável entre uma coleta e outra.
  const ordenados = [...linha].sort(
    (a, b) =>
      profundidade(a.posicao) - profundidade(b.posicao) ||
      (a.casaNaFormacao ?? 0) - (b.casaNaFormacao ?? 0),
  );

  const tamanhos = lerFormacao(formacao);
  let faixas: LineupPlayer[][];

  if (tamanhos && ordenados.length === 10) {
    faixas = [];
    let cursor = 0;
    for (const tamanho of tamanhos) {
      faixas.push(ordenados.slice(cursor, cursor + tamanho));
      cursor += tamanho;
    }
  } else {
    faixas = agruparPorFaixa(ordenados);
  }

  const linhas = [goleiros, ...faixas].filter((f) => f.length > 0);

  return linhas.flatMap((faixa, indiceDaLinha) => {
    // Dentro da linha, esquerda para a direita. `casaNaFormacao` desempata para
    // que dois jogadores com a mesma sigla não troquem de lugar a cada coleta.
    const emOrdem = [...faixa].sort(
      (a, b) =>
        lateralidade(a.posicao ?? "") - lateralidade(b.posicao ?? "") ||
        (a.casaNaFormacao ?? 0) - (b.casaNaFormacao ?? 0),
    );

    return emOrdem.map((jogador, indice) => ({
      ...jogador,
      x: avancoDaLinha(indiceDaLinha, linhas.length),
      y: espalhar(emOrdem.length, indice),
    }));
  });
}

/**
 * Nome que cabe embaixo da camisa.
 *
 * Usa o `shortName` da ESPN, que é o nome de transmissão ("J. Ricardo",
 * "M. dos Santos", "Vitinho"). Só cai no nome completo quando a fonte não manda
 * o curto — encurtar por conta própria erraria justamente os casos brasileiros
 * mais comuns.
 */
export function nomeParaOCampo(jogador: LineupPlayer): string {
  return jogador.nomeCurto ?? jogador.nome;
}
