import { asc, desc, eq, gte, lt, matches, standings, type Match, type Standing } from "@netfor/db";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";

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
  cacheLife("hours");

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
  cacheLife("hours");

  return db.select().from(standings).orderBy(asc(standings.position));
}
