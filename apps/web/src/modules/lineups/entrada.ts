import type { LineupPlayer } from "@netfor/db";

import { posicaoConhecida } from "./campo";

/**
 * Leitura da escalação digitada no painel.
 *
 * ---------------------------------------------------------------------------
 * POR QUE TEXTO E NÃO ONZE LINHAS DE FORMULÁRIO
 * ---------------------------------------------------------------------------
 * Isto é ferramenta de dia de jogo: a ESPN atrasou, o time já está em campo e o
 * operador tem minutos, não meia hora. Trinta e três campinhos separados são
 * lentos de preencher no celular e impossíveis de colar de uma vez. Uma caixa de
 * texto aceita o gesto real — digitar corrido, ou colar de onde a escalação já
 * saiu — e o parser faz o resto.
 *
 * Formato de cada linha, com número e posição opcionais:
 *
 *     1 João Ricardo G
 *     22 Maílton dos Santos RB
 *     Vitinho RF
 *     Pierre
 *
 * A posição é o que o campinho usa para posicionar. Sem ela o jogador ainda
 * entra, mas cai no miolo do campo — por isso o painel avisa quando falta.
 */

export interface LinhaLida {
  jogador: LineupPlayer;
  /** Texto original, para o painel apontar exatamente onde está o problema. */
  original: string;
  /** Sem posição: entra, mas o campinho não sabe onde pôr. */
  semPosicao: boolean;
}

/**
 * Nome curto para o campinho, quando o operador digita à mão.
 *
 * A coleta automática usa o `shortName` da ESPN, que vem pronto. Aqui não existe
 * fonte para isso, então o campo mostra o que foi digitado — e é por isso que a
 * ajuda do painel pede o nome já curto ("J. Ricardo", "Vitinho"). Encurtar por
 * conta própria erraria: "João Ricardo" viraria "Ricardo".
 */
function lerLinha(bruto: string, titular: boolean, ordem: number): LinhaLida | null {
  const linha = bruto.trim();
  if (!linha) return null;

  let resto = linha;
  let camisa: number | null = null;

  // Número da camisa, se a linha começar por ele.
  const comNumero = resto.match(/^(\d{1,3})\s+(.*)$/);
  if (comNumero) {
    camisa = Number.parseInt(comNumero[1]!, 10);
    resto = comNumero[2]!.trim();
  }

  // Posição no fim — só se for sigla conhecida, senão sobrenome vira posição.
  let posicao: string | null = null;
  const partes = resto.split(/\s+/);
  const ultima = partes[partes.length - 1] ?? "";
  if (partes.length > 1 && /^[A-Za-z]{1,3}(-[LRlr])?$/.test(ultima) && posicaoConhecida(ultima)) {
    posicao = ultima.toUpperCase();
    resto = partes.slice(0, -1).join(" ");
  }

  const nome = resto.trim();
  if (!nome) return null;

  return {
    original: linha,
    semPosicao: posicao === null,
    jogador: {
      nome,
      nomeCurto: nome,
      camisa,
      posicao,
      // Mantém a ordem digitada como desempate estável dentro da linha do campo.
      casaNaFormacao: titular ? ordem + 1 : 0,
      titular,
      substituidoPor: null,
    },
  };
}

export interface EscalacaoLida {
  jogadores: LineupPlayer[];
  titulares: number;
  /** Linhas sem posição reconhecida — o painel mostra para o operador decidir. */
  semPosicao: string[];
}

export function lerEscalacao(textoTitulares: string, textoBanco: string): EscalacaoLida {
  const ler = (texto: string, titular: boolean) =>
    texto
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((linha, i) => lerLinha(linha, titular, i))
      .filter((l): l is LinhaLida => l !== null);

  const titulares = ler(textoTitulares, true);
  const banco = ler(textoBanco, false);

  return {
    jogadores: [...titulares, ...banco].map((l) => l.jogador),
    titulares: titulares.length,
    semPosicao: titulares.filter((l) => l.semPosicao).map((l) => l.original),
  };
}

/**
 * O caminho de volta: escalação gravada → texto editável.
 *
 * Sem isto, corrigir uma camisa exigiria redigitar os onze. Reproduz exatamente
 * o formato que `lerEscalacao` aceita, então ida e volta não perdem nada.
 */
export function escreverEscalacao(jogadores: LineupPlayer[], titulares: boolean): string {
  return jogadores
    .filter((j) => j.titular === titulares)
    .map((j) =>
      [j.camisa ?? "", j.nomeCurto ?? j.nome, j.posicao ?? ""]
        .filter((p) => p !== "" && p !== null)
        .join(" "),
    )
    .join("\n");
}
