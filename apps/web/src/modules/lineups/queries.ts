import { asc, desc, eq, gte, lineups, lte, matches, type Lineup, type Match } from "@netfor/db";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";

export interface EscalacaoDoJogo {
  jogo: Match;
  casa: Lineup | null;
  fora: Lineup | null;
}

/**
 * Até quando a escalação continua em cartaz depois do apito inicial.
 *
 * 8h cobre a partida, as substituições (que só ficam completas no fim) e o resto
 * da noite, em que o torcedor ainda volta para ver quem jogou. Passado isso a
 * página anuncia o próximo jogo em vez de um time que já saiu de campo.
 */
const VALIDADE_POS_JOGO_MS = 8 * 60 * 60 * 1000;

/** Quanto antes do apito a escalação já pode aparecer. A ESPN publica ~1h antes. */
const ANTECEDENCIA_MS = 6 * 60 * 60 * 1000;

/**
 * A escalação em cartaz.
 *
 * Regra: o jogo mais recente que JÁ TEM escalação publicada e ainda está dentro
 * da validade. Não é simplesmente "o próximo jogo" — a ESPN só publica os onze
 * cerca de uma hora antes do apito, então na maior parte da semana o próximo
 * jogo não tem nada para mostrar, e a página precisa continuar servindo a
 * escalação do jogo anterior em vez de ficar vazia.
 *
 * `lineups` tem tag própria, separada de `matches`, porque a escalação muda
 * várias vezes em dia de jogo — provável, confirmada, e depois cada substituição.
 * Se dependesse da tag `matches`, que o cabeçalho de toda página lê, cada
 * alteração derrubaria o site inteiro do cache.
 */
export async function getEscalacaoEmCartaz(): Promise<EscalacaoDoJogo | null> {
  "use cache";
  cacheTag("lineups");
  cacheTag("matches");
  cacheLife("hours");

  const agora = new Date();

  const [maisRecente] = await db
    .select({ jogo: matches })
    .from(matches)
    .innerJoin(lineups, eq(lineups.matchId, matches.id))
    .where(lte(matches.kickoffAt, new Date(agora.getTime() + ANTECEDENCIA_MS)))
    .orderBy(desc(matches.kickoffAt))
    .limit(1);

  if (!maisRecente) return null;

  const jogo = maisRecente.jogo;
  // Escalação velha demais some: quem abre na quarta não quer o time que entrou
  // no domingo anunciado como se fosse o de agora.
  if (agora.getTime() - jogo.kickoffAt.getTime() > VALIDADE_POS_JOGO_MS) return null;

  const lados = await db.select().from(lineups).where(eq(lineups.matchId, jogo.id));

  return {
    jogo,
    casa: lados.find((l) => l.side === "home") ?? null,
    fora: lados.find((l) => l.side === "away") ?? null,
  };
}

/**
 * Escalações recentes, para o histórico da página e para o painel. Sem cache
 * quando chamada do painel — daí o parâmetro, em vez de duas funções quase
 * iguais.
 */
export async function listarEscalacoesRecentes(limite = 8): Promise<EscalacaoDoJogo[]> {
  const linhas = await db
    .select({ jogo: matches, escalacao: lineups })
    .from(lineups)
    .innerJoin(matches, eq(lineups.matchId, matches.id))
    .orderBy(desc(matches.kickoffAt), asc(lineups.side));

  const porJogo = new Map<number, EscalacaoDoJogo>();
  for (const linha of linhas) {
    const atual = porJogo.get(linha.jogo.id) ?? { jogo: linha.jogo, casa: null, fora: null };
    if (linha.escalacao.side === "home") atual.casa = linha.escalacao;
    else atual.fora = linha.escalacao;
    porJogo.set(linha.jogo.id, atual);
  }

  return [...porJogo.values()].slice(0, limite);
}

/**
 * Próximo jogo ainda sem escalação — é o que a página anuncia enquanto a ESPN
 * não publica os onze.
 */
export async function getJogoAguardandoEscalacao(): Promise<Match | null> {
  "use cache";
  cacheTag("matches");
  cacheLife("hours");

  const [proximo] = await db
    .select()
    .from(matches)
    .where(gte(matches.kickoffAt, new Date()))
    .orderBy(asc(matches.kickoffAt))
    .limit(1);

  return proximo ?? null;
}
