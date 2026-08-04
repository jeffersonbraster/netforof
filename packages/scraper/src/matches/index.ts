import { config } from "dotenv";

config({ path: "../../.env" });

import { createDb, eq, matches, standings, type Db } from "@netfor/db";

import { ESPN_API } from "../core/espn";
import { fetchJson } from "../core/http";
import { notifyRevalidate } from "../core/revalidate";
import { avisoDeFalha, enviarTelegram } from "../core/telegram";
import { montarAvisoDeSync } from "./aviso";
import { syncEscalacoes } from "./escalacoes";

// API pública da ESPN — dados atuais e gratuitos (API-Football free só cobre 2022–2024).
const TEAM_ID = 6272; // Fortaleza EC
const SCHEDULE_URL = `${ESPN_API}/apis/site/v2/sports/soccer/all/teams/${TEAM_ID}/schedule`;

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
const STANDINGS_URL = `${ESPN_API}/apis/v2/sports/soccer/bra.2/standings`; // Série B 2026

const competitionNames: Record<string, string> = {
  "Brazilian Serie A": "Brasileirão Série A",
  "Brazilian Serie B": "Brasileirão Série B",
  "Copa Do Brazil": "Copa do Brasil",
  "Copa do Brasil": "Copa do Brasil",
  "Copa do Nordeste": "Copa do Nordeste",
};

interface EspnCompetitor {
  homeAway?: string;
  team?: {
    displayName?: string;
    /** `schedule` devolve a lista… */
    logos?: Array<{ href?: string }>;
    /** …e `scoreboard` devolve o campo singular. Sem tratar os dois, os jogos
     *  futuros ficavam sem escudo. */
    logo?: string;
  };
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

function escudo(competidor: EspnCompetitor | undefined): string | null {
  return competidor?.team?.logos?.[0]?.href ?? competidor?.team?.logo ?? null;
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
    const url = `${ESPN_API}/apis/site/v2/sports/soccer/${liga}/scoreboard?dates=${intervalo}`;
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

/**
 * Compara só o que a UI mostra. `undefined` vs `null` e Date vs Date exigem
 * normalização — sem isso toda comparação daria "mudou" e o guarda não serviria
 * para nada.
 */
function mesmoJogo(atual: Record<string, unknown>, novo: Record<string, unknown>): boolean {
  return Object.keys(novo).every((chave) => {
    const a = atual[chave];
    const b = novo[chave];
    if (a instanceof Date || b instanceof Date) {
      return new Date(a as string).getTime() === new Date(b as string).getTime();
    }
    return (a ?? null) === (b ?? null);
  });
}

/**
 * Retorna quantos jogos vieram da ESPN e se ALGUM deles mudou de fato.
 *
 * O "mudou" é o que importa: este job roda de 15 em 15 minutos e antes
 * revalidava a tag `matches` em toda execução. Como `getProximoJogo()` vive no
 * layout raiz, cada revalidação dessas invalidava o cache de TODAS as páginas —
 * 96 vezes por dia, quase sempre sem nenhum placar novo. Era o maior consumidor
 * de escrita no KV e o motivo de o Neon nunca chegar a suspender.
 */
/** Como o jogo aparece no aviso: "Palmeiras 3 × 0 Fortaleza". */
function descrever(v: {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}): string {
  const placar = v.homeScore === null || v.awayScore === null ? "×" : `${v.homeScore} × ${v.awayScore}`;
  return `${v.homeTeam} ${placar} ${v.awayTeam}`;
}

const ROTULO_ESTADO: Record<string, string> = {
  scheduled: "agendado",
  live: "ao vivo",
  finished: "encerrado",
};

async function syncMatches(
  db: Db,
): Promise<{ total: number; mudou: boolean; mudancas: string[] }> {
  const events = await coletarEventos();
  let synced = 0;
  let mudou = false;
  /**
   * O que mudou, em texto pronto para o aviso.
   *
   * Sem isto o Telegram diria só "algo mudou nos jogos", que não vale a
   * interrupção: o ponto do aviso é saber o placar sem abrir nada.
   */
  const mudancas: string[] = [];

  const existentes = new Map(
    (await db.select().from(matches)).map((linha) => [linha.externalId, linha]),
  );

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
      homeLogo: escudo(home),
      awayLogo: escudo(away),
      homeScore: status === "scheduled" ? null : (home.score?.value ?? null),
      awayScore: status === "scheduled" ? null : (away.score?.value ?? null),
      stadium: comp?.venue?.fullName ?? null,
      kickoffAt: kickoff,
      status,
    };

    synced++;

    // Escreve só o que mudou: poupa write no Neon e, principalmente, evita
    // acordar a revalidação sem motivo.
    const atual = existentes.get(externalId);
    if (atual && mesmoJogo(atual as unknown as Record<string, unknown>, values)) continue;

    mudou = true;

    // Jogo novo na agenda e placar que mexeu são coisas diferentes para quem lê
    // o aviso: um é calendário, o outro é dia de jogo.
    if (!atual) {
      mudancas.push(`novo na agenda: ${values.homeTeam} × ${values.awayTeam}`);
    } else {
      const mudouPlacar =
        atual.homeScore !== values.homeScore || atual.awayScore !== values.awayScore;
      const mudouEstado = atual.status !== values.status;
      if (mudouPlacar || mudouEstado) {
        const estado = ROTULO_ESTADO[values.status] ?? values.status;
        mudancas.push(`${descrever(values)} — ${estado}`);
      } else {
        mudancas.push(`${values.homeTeam} × ${values.awayTeam}: detalhe atualizado`);
      }
    }

    await db
      .insert(matches)
      .values({ externalId, ...values })
      .onConflictDoUpdate({ target: matches.externalId, set: values });
  }

  return { total: synced, mudou, mudancas };
}

async function syncStandings(
  db: Db,
): Promise<{ total: number; mudou: boolean; leao: string | null }> {
  const data = await fetchJson<EspnStandingsResponse>(STANDINGS_URL);
  const entries = data.children?.[0]?.standings?.entries ?? [];
  if (entries.length === 0) {
    console.warn("⚠️  Classificação vazia — verificar endpoint da ESPN.");
    return { total: 0, mudou: false, leao: null };
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
  const anteriores = new Map((await db.select().from(standings)).map((l) => [l.position, l]));
  let mudou = false;

  for (const row of rows) {
    // `updatedAt` fica de fora da comparação: é carimbo de execução, mudaria
    // sempre e faria toda rodada parecer que a tabela virou.
    const { updatedAt: _ignorado, ...comparavel } = row;
    const atual = anteriores.get(row.position);
    if (
      atual &&
      mesmoJogo(atual as unknown as Record<string, unknown>, comparavel as Record<string, unknown>)
    ) {
      continue;
    }

    mudou = true;
    await db
      .insert(standings)
      .values(row)
      .onConflictDoUpdate({ target: standings.position, set: row });
  }

  // Remove posições que deixaram de existir (ex.: mudança de temporada)
  const maxPosition = Math.max(...rows.map((r) => r.position));
  for (const [position] of anteriores) {
    if (position > maxPosition) {
      mudou = true;
      await db.delete(standings).where(eq(standings.position, position));
    }
  }

  /**
   * A linha do Fortaleza, para o aviso.
   *
   * "A tabela mudou" é informação inútil — muda quase toda rodada, por causa de
   * outros times. O que interessa a quem lê é onde o Leão está agora, e se
   * subiu ou desceu em relação ao que estava gravado.
   */
  const doLeao = rows.find((r) => r.teamName.toLowerCase().includes("fortaleza"));
  let leao: string | null = null;
  if (doLeao) {
    const antes = [...anteriores.values()].find((l) =>
      l.teamName.toLowerCase().includes("fortaleza"),
    );
    const seta =
      antes && antes.position !== doLeao.position
        ? antes.position > doLeao.position
          ? ` ↑ (era ${antes.position}º)`
          : ` ↓ (era ${antes.position}º)`
        : "";
    leao = `${doLeao.position}º com ${doLeao.points} pts em ${doLeao.played} jogos${seta}`;
  }

  return { total: rows.length, mudou, leao };
}

async function main() {
  const startedAt = Date.now();
  const db = createDb();

  /**
   * `allSettled`, não `all`: agenda e classificação são independentes.
   *
   * Com `Promise.all`, a classificação estourando derrubava `main()` inteira e
   * a AGENDA NÃO ERA GRAVADA — mesmo tendo sido coletada com sucesso. Foi assim
   * que o bloqueio da ESPN em 04/08/2026 virou "dados desatualizados" no site:
   * não é que a coleta tenha vindo vazia, é que o resultado bom foi descartado
   * junto com o ruim. As duas consultas batem em endpoints diferentes e uma
   * pode quebrar sozinha (mudança de temporada muda o caminho do standings).
   */
  const [resJogos, resTabela] = await Promise.allSettled([syncMatches(db), syncStandings(db)]);

  const falhas: string[] = [];
  function ou<T>(resultado: PromiseSettledResult<T>, rotulo: string, vazio: T): T {
    if (resultado.status === "fulfilled") return resultado.value;
    const motivo =
      resultado.reason instanceof Error ? resultado.reason.message : String(resultado.reason);
    console.error(`⚠️  ${rotulo} falhou: ${motivo}`);
    falhas.push(`${rotulo}: ${motivo}`);
    return vazio;
  }

  const jogos = ou(resJogos, "Agenda", { total: 0, mudou: false, mudancas: [] as string[] });
  const tabela = ou(resTabela, "Classificação", {
    total: 0,
    mudou: false,
    leao: null as string | null,
  });

  /**
   * As duas fora é outra história: significa a ESPN inteira indisponível, não
   * um endpoint. Aí vale o caminho fatal de sempre — Telegram e código 1 — em
   * vez de gravar zero e declarar sucesso.
   */
  if (falhas.length === 2) {
    throw new Error(`ESPN indisponível nas duas consultas — ${falhas.join(" | ")}`);
  }

  // Uma só fora não descarta o que funcionou, mas ainda pinta o job de vermelho:
  // o dado bom foi salvo E você fica sabendo que metade parou de chegar.
  if (falhas.length > 0) process.exitCode = 1;

  /**
   * Escalações depois dos jogos, e não em paralelo: a janela é calculada a
   * partir de `matches.kickoff_at`, então precisa ler a agenda já atualizada.
   * Num jogo remarcado, rodar junto usaria o horário velho e perderia a coleta.
   *
   * Falha aqui não derruba o job: escalação é enfeite ao lado de placar e tabela.
   */
  let escalacoes = { gravadas: 0, jogos: 0 };
  try {
    escalacoes = await syncEscalacoes(db);
  } catch (erro) {
    console.warn("⚠️  Escalações falharam:", erro instanceof Error ? erro.message : erro);
  }

  // Revalida só a tag que mudou. Sem nada novo, não toca no cache — e é esse o
  // caso na esmagadora maioria das rodadas, já que o job roda a cada 15 min mas
  // placar só muda em dia de jogo.
  const tags = [
    ...(jogos.mudou ? ["matches"] : []),
    ...(tabela.mudou ? ["standings"] : []),
    // Tag PRÓPRIA, separada de `matches`: a escalação muda várias vezes em dia de
    // jogo (provável → confirmada → substituições), e `matches` é lida pelo
    // cabeçalho de TODA página. Reaproveitar aquela tag derrubaria o site inteiro
    // do cache a cada substituição.
    ...(escalacoes.gravadas > 0 ? ["lineups"] : []),
  ];

  let revalidou = true;
  if (tags.length > 0) {
    revalidou = await notifyRevalidate(tags);
    if (!revalidou) process.exitCode = 1;
  } else {
    console.log("↷ Nada mudou — cache preservado.");
  }

  /**
   * Aviso SÓ quando algo mudou de verdade.
   *
   * Este job roda a cada 30 min, ~48× por dia, e na esmagadora maioria das
   * rodadas não há novidade nenhuma. Avisar sempre encheria o Telegram de "nada
   * mudou" e o bot seria silenciado — e aí o aviso que importa, o de dia de
   * jogo, se perderia junto.
   */
  if (tags.length > 0) {
    await enviarTelegram(
      montarAvisoDeSync({
        mudancasDeJogo: jogos.mudancas,
        tabelaMudou: tabela.mudou,
        leao: tabela.leao,
        escalacoesGravadas: escalacoes.gravadas,
        revalidou,
        falhas,
      }),
    );
  }

  console.log(
    `Sync de jogos concluído em ${((Date.now() - startedAt) / 1000).toFixed(1)}s — ${jogos.total} jogos, ${tabela.total} posições na tabela, ${escalacoes.gravadas} escalação(ões) em ${escalacoes.jogos} jogo(s) na janela.`,
  );
}

/**
 * Falha fatal SEMPRE avisa.
 *
 * É a metade que faltava: sem aviso de erro, silêncio significaria as duas
 * coisas ao mesmo tempo — "nada mudou" e "o job está quebrado há três dias" — e
 * não haveria como distinguir sem abrir o Actions. Com este aviso, silêncio
 * passa a significar só uma coisa.
 */
main().catch(async (error) => {
  console.error("Erro fatal no sync de jogos:", error);
  await enviarTelegram(
    avisoDeFalha(
      "Sync de jogos",
      error,
      "Placar, tabela e escalação podem estar desatualizados no site. Log: Actions → Sync de jogos e classificação.",
    ),
  );
  process.exit(1);
});
