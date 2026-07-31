import { config } from "dotenv";

config({ path: "../../.env" });

import { createDb, eq, matches, standings, type Db } from "@netfor/db";

import { fetchJson } from "../core/http";
import { notifyRevalidate } from "../core/revalidate";

// API pública da ESPN — dados atuais e gratuitos (API-Football free só cobre 2022–2024).
const TEAM_ID = 6272; // Fortaleza EC
const SCHEDULE_URL = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${TEAM_ID}/schedule`;
const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/soccer/bra.2/standings"; // Série B 2026

const competitionNames: Record<string, string> = {
  "Brazilian Serie A": "Brasileirão Série A",
  "Brazilian Serie B": "Brasileirão Série B",
  "Copa Do Brazil": "Copa do Brasil",
  "Copa do Brasil": "Copa do Brasil",
  "Copa do Nordeste": "Copa do Nordeste",
};

interface EspnCompetitor {
  homeAway?: string;
  team?: { displayName?: string; logos?: Array<{ href?: string }> };
  score?: { value?: number };
}

interface EspnEvent {
  id?: string;
  date?: string;
  league?: { name?: string };
  competitions?: Array<{
    venue?: { fullName?: string };
    status?: { type?: { state?: string } };
    competitors?: EspnCompetitor[];
  }>;
}

interface EspnScheduleResponse {
  events?: EspnEvent[];
}

interface EspnStandingsResponse {
  children?: Array<{
    standings?: {
      entries?: Array<{
        team?: { displayName?: string; logos?: Array<{ href?: string }> };
        stats?: Array<{ name?: string; value?: number }>;
      }>;
    };
  }>;
}

function mapStatus(state: string | undefined): "scheduled" | "live" | "finished" {
  if (state === "in") return "live";
  if (state === "post") return "finished";
  return "scheduled";
}

async function syncMatches(db: Db): Promise<number> {
  const data = await fetchJson<EspnScheduleResponse>(SCHEDULE_URL);
  const events = data.events ?? [];
  let synced = 0;

  for (const event of events) {
    const externalId = Number(event.id);
    const kickoff = event.date ? new Date(event.date) : null;
    const competition = event.league?.name ?? "Desconhecida";
    const comp = event.competitions?.[0];
    const competitors = comp?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === "home");
    const away = competitors.find((c) => c.homeAway === "away");

    if (!externalId || !kickoff || Number.isNaN(kickoff.getTime()) || !home || !away) continue;

    const status = mapStatus(comp?.status?.type?.state);
    const values = {
      competition: competitionNames[competition] ?? competition,
      round: null,
      homeTeam: home.team?.displayName ?? "?",
      awayTeam: away.team?.displayName ?? "?",
      homeLogo: home.team?.logos?.[0]?.href ?? null,
      awayLogo: away.team?.logos?.[0]?.href ?? null,
      homeScore: status === "scheduled" ? null : (home.score?.value ?? null),
      awayScore: status === "scheduled" ? null : (away.score?.value ?? null),
      stadium: comp?.venue?.fullName ?? null,
      kickoffAt: kickoff,
      status,
    };

    await db
      .insert(matches)
      .values({ externalId, ...values })
      .onConflictDoUpdate({ target: matches.externalId, set: values });
    synced++;
  }

  return synced;
}

async function syncStandings(db: Db): Promise<number> {
  const data = await fetchJson<EspnStandingsResponse>(STANDINGS_URL);
  const entries = data.children?.[0]?.standings?.entries ?? [];
  if (entries.length === 0) {
    console.warn("⚠️  Classificação vazia — verificar endpoint da ESPN.");
    return 0;
  }

  const rows = entries.flatMap((entry) => {
    const stats = new Map((entry.stats ?? []).map((s) => [s.name, s.value]));
    const position = stats.get("rank");
    const teamName = entry.team?.displayName;
    if (!position || !teamName) return [];
    return [
      {
        position: Number(position),
        teamName,
        teamLogo: entry.team?.logos?.[0]?.href ?? null,
        points: Number(stats.get("points") ?? 0),
        played: Number(stats.get("gamesPlayed") ?? 0),
        wins: Number(stats.get("wins") ?? 0),
        draws: Number(stats.get("ties") ?? 0),
        losses: Number(stats.get("losses") ?? 0),
        goalsFor: Number(stats.get("pointsFor") ?? 0),
        goalsAgainst: Number(stats.get("pointsAgainst") ?? 0),
        updatedAt: new Date(),
      },
    ];
  });

  // Substituição total: a tabela é pequena e o estado é sempre o snapshot atual
  for (const row of rows) {
    await db
      .insert(standings)
      .values(row)
      .onConflictDoUpdate({ target: standings.position, set: row });
  }
  // Remove posições que deixaram de existir (ex.: mudança de temporada)
  const maxPosition = Math.max(...rows.map((r) => r.position));
  const all = await db.select({ position: standings.position }).from(standings);
  for (const row of all) {
    if (row.position > maxPosition) {
      await db.delete(standings).where(eq(standings.position, row.position));
    }
  }

  return rows.length;
}

async function main() {
  const startedAt = Date.now();
  const db = createDb();

  const [matchCount, standingCount] = await Promise.all([syncMatches(db), syncStandings(db)]);
  if (!(await notifyRevalidate(["matches", "standings"]))) process.exitCode = 1;

  console.log(
    `Sync de jogos concluído em ${((Date.now() - startedAt) / 1000).toFixed(1)}s — ${matchCount} jogos, ${standingCount} posições na tabela.`,
  );
}

main().catch((error) => {
  console.error("Erro fatal no sync de jogos:", error);
  process.exit(1);
});
