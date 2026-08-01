import { asc, desc, eq, gte, lt, matches, standings, type Match, type Standing } from "@netfor/db";
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

export async function getStandings(): Promise<Standing[]> {
  "use cache";
  cacheTag("standings");
  cacheLife("days");

  return db.select().from(standings).orderBy(asc(standings.position));
}
