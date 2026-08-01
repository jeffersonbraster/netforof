import { asc, desc, eq, gte, lt, ne, matches, standings, type Match, type Standing } from "@netfor/db";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";

/**
 * Continua em "hours" de propósito: o corte passado/futuro usa `now`, então o
 * resultado envelhece sozinho, sem depender de mudança no banco. Com "days" um
 * jogo já encerrado seguiria anunciado como "próximo" por até um dia.
 */
export async function getTickerMatches(): Promise<Match[]> {
  "use cache";
  cacheTag("matches");
  cacheLife("hours");

  const now = new Date();
  // Um resultado à esquerda para ancorar, três jogos à frente para a expectativa.
  const [upcoming, lastFinished] = await Promise.all([
    db
      .select()
      .from(matches)
      .where(gte(matches.kickoffAt, now))
      .orderBy(asc(matches.kickoffAt))
      .limit(3),
    db
      .select()
      .from(matches)
      .where(lt(matches.kickoffAt, now))
      .orderBy(desc(matches.kickoffAt))
      .limit(1),
  ]);

  return [...lastFinished, ...upcoming];
}

/**
 * Próximo jogo, para a linha de estado do masthead. Fica em "hours" pela mesma
 * razão do ticker: o corte usa `now`, então envelhece sozinho.
 */
export async function getProximoJogo(): Promise<Match | null> {
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

/** Também depende de `now` para separar agenda de resultados — ver getTickerMatches. */
export async function getAgenda(): Promise<{ upcoming: Match[]; results: Match[] }> {
  "use cache";
  cacheTag("matches");
  cacheLife("hours");

  const now = new Date();
  const [upcoming, results] = await Promise.all([
    db.select().from(matches).where(gte(matches.kickoffAt, now)).orderBy(asc(matches.kickoffAt)),
    db
      .select()
      .from(matches)
      .where(lt(matches.kickoffAt, now))
      .orderBy(desc(matches.kickoffAt))
      .limit(20),
  ]);

  return { upcoming, results };
}

export async function getRecentResults(limit: number): Promise<Match[]> {
  "use cache";
  cacheTag("matches");
  cacheLife("days");

  return db
    .select()
    .from(matches)
    .where(eq(matches.status, "finished"))
    .orderBy(desc(matches.kickoffAt))
    .limit(limit);
}

/**
 * Campanha em copas de mata-mata.
 *
 * Copa do Brasil não tem tabela de classificação — é eliminatória. Mostrar uma
 * "classificação" dela seria inventar. O que existe e interessa ao torcedor é a
 * campanha: os jogos disputados e os que vêm. Serve para Copa do Nordeste e
 * Cearense quando entrarem.
 */
export async function getCampanhaDeCopas(): Promise<
  Array<{ competicao: string; jogos: Match[] }>
> {
  "use cache";
  cacheTag("matches");
  cacheLife("hours");

  const linhas = await db
    .select()
    .from(matches)
    .where(ne(matches.competition, "Brasileirão Série B"))
    .orderBy(asc(matches.kickoffAt));

  const porCompeticao = new Map<string, Match[]>();
  for (const jogo of linhas) {
    const atual = porCompeticao.get(jogo.competition) ?? [];
    atual.push(jogo);
    porCompeticao.set(jogo.competition, atual);
  }

  // Só competições com jogo futuro: campeonato encerrado não interessa na página.
  const agora = Date.now();
  return [...porCompeticao.entries()]
    .filter(([, jogos]) => jogos.some((j) => j.kickoffAt.getTime() >= agora))
    .map(([competicao, jogos]) => ({ competicao, jogos }));
}

export async function getStandings(): Promise<Standing[]> {
  "use cache";
  cacheTag("standings");
  cacheLife("days");

  return db.select().from(standings).orderBy(asc(standings.position));
}
