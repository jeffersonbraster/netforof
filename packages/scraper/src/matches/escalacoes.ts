import { and, eq, gte, lineups, lte, matches, type Db, type LineupPlayer } from "@netfor/db";

import { ESPN_API } from "../core/espn";
import { fetchJson } from "../core/http";

/**
 * Escalações, do endpoint `summary` da ESPN.
 *
 * ---------------------------------------------------------------------------
 * POR QUE A ESPN E NÃO A API-FOOTBALL
 * ---------------------------------------------------------------------------
 * Pelo mesmo motivo que os jogos e a classificação já vêm dela: o plano gratuito
 * da API-Football só cobre as temporadas de 2022 a 2024, então não existe
 * escalação de 2026 lá. A ESPN entrega formação, titulares, posição, camisa e
 * substituições, de graça, na mesma API que o projeto já consome — sem chave
 * nova, sem fornecedor a mais.
 *
 * ---------------------------------------------------------------------------
 * DUAS COISAS VERIFICADAS NA API, QUE MOLDAM ESTE ARQUIVO
 * ---------------------------------------------------------------------------
 * 1. O slug da liga no caminho é IGNORADO. `summary?event=<id>` devolve o mesmo
 *    payload com `bra.2` ou com `bra.copa_do_brazil`, para evento de qualquer
 *    das duas. Por isso existe uma constante só aqui, e não um mapa de
 *    competição para slug que daria manutenção e erraria em competição nova.
 *
 * 2. Jogo futuro responde 200 com `rosters` PRESENTE e vazio — dois times, sem
 *    formação e com zero titulares. Conferir só `rosters.length` gravaria uma
 *    escalação fantasma, e a página mostraria um campo vazio. O corte real é a
 *    contagem de titulares.
 */

/** Qualquer liga serve: o caminho é ignorado pelo endpoint (ver cabeçalho). */
const SUMMARY_URL = `${ESPN_API}/apis/site/v2/sports/soccer/bra.2/summary`;

/**
 * Janela em que vale a pena perguntar pela escalação.
 *
 * A ESPN publica cerca de 1h antes do apito; 4h de folga para trás cobre atraso
 * de publicação e jogo adiado. Para a frente, 5h cobre a partida inteira mais as
 * substituições, que só ficam completas depois do apito final.
 *
 * Sem essa janela o job pediria o summary de todo jogo da agenda a cada rodada —
 * dezenas de requisições por hora para receber `rosters` vazio.
 */
const ANTES_MS = 4 * 60 * 60 * 1000;
const DEPOIS_MS = 5 * 60 * 60 * 1000;

export interface JanelaDeColeta {
  /** Quanto tempo ANTES do apito já vale perguntar. */
  antesMs?: number;
  /** Quanto tempo DEPOIS do apito ainda vale perguntar. */
  depoisMs?: number;
}

interface EspnAtleta {
  athlete?: { displayName?: string; shortName?: string };
  jersey?: string;
  starter?: boolean;
  formationPlace?: string | number;
  position?: { abbreviation?: string };
  subbedOutFor?: { athlete?: { displayName?: string } };
}

interface EspnRoster {
  homeAway?: string;
  formation?: string;
  team?: { displayName?: string; logo?: string; logos?: Array<{ href?: string }> };
  roster?: EspnAtleta[];
}

interface EspnSummary {
  rosters?: EspnRoster[];
}

function numeroOuNulo(bruto: string | number | undefined): number | null {
  if (bruto === undefined || bruto === "") return null;
  const n = typeof bruto === "number" ? bruto : Number.parseInt(bruto, 10);
  return Number.isFinite(n) ? n : null;
}

function converterAtleta(atleta: EspnAtleta): LineupPlayer | null {
  const nome = atleta.athlete?.displayName?.trim();
  if (!nome) return null;

  return {
    nome,
    nomeCurto: atleta.athlete?.shortName?.trim() || null,
    camisa: numeroOuNulo(atleta.jersey),
    posicao: atleta.position?.abbreviation ?? null,
    casaNaFormacao: numeroOuNulo(atleta.formationPlace),
    titular: atleta.starter === true,
    substituidoPor: atleta.subbedOutFor?.athlete?.displayName ?? null,
  };
}

/**
 * Assinatura estável de um elenco.
 *
 * `JSON.stringify` direto NÃO serve aqui, e isso custou uma depuração: `players`
 * é `jsonb`, e o Postgres REORDENA as chaves ao gravar (por tamanho, depois
 * alfabética). O objeto que volta do banco sai como `nome, camisa, posicao,
 * titular, nomeCurto…` enquanto o recém-montado sai na ordem do código. Os dois
 * textos nunca batiam, mesmo com conteúdo idêntico — então o guarda de mudança
 * dava "mudou" em toda rodada, regravava as duas escalações e revalidava a tag
 * `lineups` de meia em meia hora sem nada ter acontecido.
 *
 * Campo a campo, em ordem fixa: imune a como cada lado serializa.
 */
function assinatura(jogadores: LineupPlayer[]): string {
  return jogadores
    .map((j) =>
      [
        j.nome,
        j.nomeCurto ?? "",
        j.camisa ?? "",
        j.posicao ?? "",
        j.casaNaFormacao ?? "",
        j.titular ? "1" : "0",
        j.substituidoPor ?? "",
      ].join(""),
    )
    .join("");
}

/**
 * Compara o que a página mostra. Sem isto, cada rodada regravaria as duas linhas
 * e acordaria a revalidação — o mesmo erro que já custou a cota de KV uma vez.
 */
function mesmaEscalacao(
  atual: { formation: string | null; players: LineupPlayer[] },
  novo: { formation: string | null; players: LineupPlayer[] },
): boolean {
  return (
    atual.formation === novo.formation && assinatura(atual.players) === assinatura(novo.players)
  );
}

/**
 * Coleta as escalações dos jogos na janela. Devolve quantos lados foram gravados
 * de fato — zero significa "nada mudou", não "falhou".
 */
export async function syncEscalacoes(
  db: Db,
  janela: JanelaDeColeta = {},
): Promise<{ gravadas: number; jogos: number }> {
  const agora = Date.now();
  const antes = janela.antesMs ?? ANTES_MS;
  const depois = janela.depoisMs ?? DEPOIS_MS;

  const jogos = await db
    .select({ id: matches.id, externalId: matches.externalId })
    .from(matches)
    .where(
      and(
        gte(matches.kickoffAt, new Date(agora - depois)),
        lte(matches.kickoffAt, new Date(agora + antes)),
      ),
    );

  if (jogos.length === 0) return { gravadas: 0, jogos: 0 };

  let gravadas = 0;

  for (const jogo of jogos) {
    let dados: EspnSummary;
    try {
      dados = await fetchJson<EspnSummary>(`${SUMMARY_URL}?event=${jogo.externalId}`);
    } catch (erro) {
      console.warn(
        `  escalação ${jogo.externalId}: summary falhou (${erro instanceof Error ? erro.message : erro})`,
      );
      continue;
    }

    const existentes = new Map(
      (await db.select().from(lineups).where(eq(lineups.matchId, jogo.id))).map((l) => [l.side, l]),
    );

    for (const roster of dados.rosters ?? []) {
      const lado = roster.homeAway === "home" ? "home" : roster.homeAway === "away" ? "away" : null;
      const time = roster.team?.displayName?.trim();
      if (!lado || !time) continue;

      const jogadores = (roster.roster ?? [])
        .map(converterAtleta)
        .filter((p): p is LineupPlayer => p !== null);

      // O corte que importa: antes de a ESPN publicar, `rosters` existe mas não
      // tem nenhum titular. Gravar aqui criaria um campo vazio na página.
      if (!jogadores.some((p) => p.titular)) continue;

      const valores = {
        teamName: time,
        teamLogo: roster.team?.logo ?? roster.team?.logos?.[0]?.href ?? null,
        formation: roster.formation?.trim() || null,
        players: jogadores,
        updatedAt: new Date(),
      };

      const atual = existentes.get(lado);

      /**
       * Lado digitado no painel é intocável.
       *
       * O painel é o plano B de dia de jogo: se a ESPN atrasar ou vier errada, o
       * operador escala à mão. Sobrescrever aqui apagaria esse trabalho na rodada
       * seguinte, em silêncio — o painel viraria enfeite. A volta ao automático é
       * decisão dele, por botão.
       */
      if (atual?.origin === "manual") {
        console.log(`  escalação ${jogo.externalId}/${lado}: manual, preservada`);
        continue;
      }

      if (atual && mesmaEscalacao(atual, valores)) continue;

      await db
        .insert(lineups)
        .values({ matchId: jogo.id, side: lado, ...valores })
        .onConflictDoUpdate({
          target: [lineups.matchId, lineups.side],
          set: valores,
        });
      gravadas++;
    }
  }

  return { gravadas, jogos: jogos.length };
}
