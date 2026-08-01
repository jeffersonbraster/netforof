import { config } from "dotenv";

config({ path: "../../.env" });

import { createDb, eq, matches, standings, type Db } from "@netfor/db";

import { fetchJson } from "../core/http";
import { notifyRevalidate } from "../core/revalidate";

// API pública da ESPN — dados atuais e gratuitos (API-Football free só cobre 2022–2024).
const TEAM_ID = 6272; // Fortaleza EC
const SCHEDULE_URL = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${TEAM_ID}/schedule`;

/**
 * Ligas onde procurar jogos FUTUROS por intervalo de datas.
 *
 * O endpoint `/teams/<id>/schedule` só devolvia jogos passados — em 01/08/2026
 * o último evento era de 17/03, e a agenda do site ficava vazia. Os jogos
 * existem: estão no `scoreboard` da liga, consultado por intervalo. Por isso
 * a coleta usa os dois: o schedule traz o histórico, o scoreboard traz o que
 * vem pela frente.
 */
const LIGAS_FUTURAS = ["bra.2", "bra.copa_do_brazil"] as const;

/** Janela de busca para frente, em dias. */
const JANELA_DIAS = 75;

function intervaloDeDatas(): string {
  const hoje = new Date();
  const fim = new Date(hoje.getTime() + JANELA_DIAS * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return `${fmt(hoje)}-${fmt(fim)}`;
}
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
  leagues?: Array<{ name?: string }>;
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

/** Só interessa jogo em que o Fortaleza está em campo. */
function envolveOFortaleza(event: EspnEvent): boolean {
  const nomes = (event.competitions?.[0]?.competitors ?? [])
    .map((c) => c.team?.displayName ?? "")
    .join(" ");
  return nomes.includes("Fortaleza");
}

async function coletarEventos(): Promise<EspnEvent[]> {
  const eventos: EspnEvent[] = [];

  // Histórico
  try {
    const passado = await fetchJson<EspnScheduleResponse>(SCHEDULE_URL);
    eventos.push(...(passado.events ?? []));
  } catch (erro) {
    console.warn("⚠️  Schedule da ESPN falhou:", erro instanceof Error ? erro.message : erro);
  }

  // Futuro, liga a liga
  const intervalo = intervaloDeDatas();
  for (const liga of LIGAS_FUTURAS) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${liga}/scoreboard?dates=${intervalo}`;
    try {
      const dados = await fetchJson<EspnScheduleResponse>(url);
      // No scoreboard o nome da liga vive na raiz, não em cada evento — sem
      // isto todo jogo futuro entrava como "Desconhecida".
      const nomeDaLiga = dados.leagues?.[0]?.name;
      const doFortaleza = (dados.events ?? [])
        .filter(envolveOFortaleza)
        .map((e) => ({ ...e, league: e.league ?? { name: nomeDaLiga } }));
      eventos.push(...doFortaleza);
      console.log(`  ${liga}: ${doFortaleza.length} jogo(s) do Fortaleza na janela`);
    } catch (erro) {
      // Liga fora de temporada devolve payload inválido — não é falha da coleta.
      console.warn(`  ${liga}: sem dados (${erro instanceof Error ? erro.message : erro})`);
    }
  }

  return eventos;
}

async function syncMatches(db: Db): Promise<number> {
  const events = await coletarEventos();
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
