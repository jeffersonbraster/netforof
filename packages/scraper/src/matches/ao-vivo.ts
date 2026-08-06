import { MARCA } from "../core/telegram";

/**
 * Leitura do jogo AO VIVO e detecção do que acabou de acontecer.
 *
 * Mora fora do `index.ts` pelo mesmo motivo que o `aviso.ts`: aquele arquivo
 * dispara `main()` ao ser importado, então nada que viva lá pode ser exercitado
 * sem bater na ESPN e escrever no banco. O que decide o texto que chega no seu
 * Telefone precisa ser testável com dois objetos em memória.
 */

/** As duas formas em que a ESPN devolve placar, conforme o endpoint. */
export type PlacarBruto = { value?: number } | string | number | undefined | null;

/** Aceita as duas formas. String vazia e ausência viram nulo. */
export function placar(bruto: PlacarBruto): number | null {
  if (bruto === undefined || bruto === null || bruto === "") return null;
  const n = typeof bruto === "object" ? bruto.value : Number(bruto);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export interface EspnResumoDoPlantao {
  header?: {
    competitions?: Array<{
      status?: { type?: { state?: string; description?: string }; displayClock?: string };
      competitors?: Array<{
        homeAway?: string;
        score?: { value?: number } | string | number;
        team?: { displayName?: string; shortDisplayName?: string };
      }>;
    }>;
  };
  rosters?: Array<{
    homeAway?: string;
    formation?: string;
    roster?: Array<{
      starter?: boolean;
      athlete?: { displayName?: string };
      subbedOutFor?: { athlete?: { displayName?: string } };
    }>;
  }>;
}

/**
 * Retrato do jogo num instante. É o que o plantão compara de um ciclo para o
 * outro — a diferença entre dois retratos é o que virou aviso no Telegram.
 */
export interface Instantaneo {
  estado: string;
  descricao: string;
  relogio: string;
  casa: string;
  fora: string;
  golsCasa: number | null;
  golsFora: number | null;
  formacaoCasa: string | null;
  formacaoFora: string | null;
  titularesCasa: number;
  titularesFora: number;
  substituicoes: number;
}

function ladoDoRoster(resumo: EspnResumoDoPlantao, lado: "home" | "away") {
  return (resumo.rosters ?? []).find((r) => r.homeAway === lado);
}

function titulares(roster: ReturnType<typeof ladoDoRoster>): number {
  return (roster?.roster ?? []).filter((a) => a.starter === true).length;
}

export function retratar(resumo: EspnResumoDoPlantao): Instantaneo | null {
  const competicao = resumo.header?.competitions?.[0];
  if (!competicao) return null;

  const casa = competicao.competitors?.find((c) => c.homeAway === "home");
  const fora = competicao.competitors?.find((c) => c.homeAway === "away");
  const rosterCasa = ladoDoRoster(resumo, "home");
  const rosterFora = ladoDoRoster(resumo, "away");

  return {
    estado: competicao.status?.type?.state ?? "",
    descricao: competicao.status?.type?.description ?? "",
    relogio: competicao.status?.displayClock ?? "",
    casa: casa?.team?.shortDisplayName ?? casa?.team?.displayName ?? "Casa",
    fora: fora?.team?.shortDisplayName ?? fora?.team?.displayName ?? "Fora",
    golsCasa: placar(casa?.score),
    golsFora: placar(fora?.score),
    formacaoCasa: rosterCasa?.formation ?? null,
    formacaoFora: rosterFora?.formation ?? null,
    titularesCasa: titulares(rosterCasa),
    titularesFora: titulares(rosterFora),
    substituicoes: (resumo.rosters ?? []).reduce(
      (total, r) => total + (r.roster ?? []).filter((a) => a.subbedOutFor?.athlete).length,
      0,
    ),
  };
}

/** Placar em texto, para o corpo do aviso. */
export function textoDoPlacar(i: Instantaneo): string {
  return `${i.casa} ${i.golsCasa ?? 0} × ${i.golsFora ?? 0} ${i.fora}`;
}

/**
 * O que aconteceu entre dois retratos, em linguagem de torcedor.
 *
 * `antes` nulo é o primeiro ciclo do plantão: ali não houve acontecimento
 * nenhum, só a leitura inicial. Avisar nesse caso mandaria "bola rolando" toda
 * vez que o job reiniciasse no meio da partida.
 */
export function acontecimentos(antes: Instantaneo | null, agora: Instantaneo): string[] {
  if (!antes) return [];

  const linhas: string[] = [];

  const escalouAgora =
    antes.titularesCasa + antes.titularesFora === 0 && agora.titularesCasa + agora.titularesFora > 0;
  if (escalouAgora) {
    const formacoes = [
      agora.formacaoCasa ? `${agora.casa} ${agora.formacaoCasa}` : null,
      agora.formacaoFora ? `${agora.fora} ${agora.formacaoFora}` : null,
    ].filter(Boolean);
    linhas.push(
      `${MARCA.escalacao} <b>Escalação confirmada</b>${formacoes.length ? ` — ${formacoes.join(" · ")}` : ""}`,
    );
  }

  if (antes.estado !== "in" && agora.estado === "in") {
    linhas.push(`${MARCA.jogos} <b>Bola rolando</b> — ${textoDoPlacar(agora)}`);
  }

  // Gol antes de estado final: numa mesma leitura, "gol" e "fim" juntos devem
  // sair na ordem em que aconteceram.
  const golCasa = (agora.golsCasa ?? 0) - (antes.golsCasa ?? 0);
  const golFora = (agora.golsFora ?? 0) - (antes.golsFora ?? 0);
  if (golCasa > 0 || golFora > 0) {
    const dono = golCasa > 0 ? agora.casa : agora.fora;
    const minuto = agora.relogio ? ` (${agora.relogio})` : "";
    linhas.push(`${MARCA.jogos} <b>GOL do ${dono}</b>${minuto} — ${textoDoPlacar(agora)}`);
  }

  if (antes.substituicoes < agora.substituicoes && agora.estado === "in") {
    const quantas = agora.substituicoes - antes.substituicoes;
    linhas.push(
      `🔁 <b>${quantas === 1 ? "Substituição" : `${quantas} substituições`}</b>${agora.relogio ? ` (${agora.relogio})` : ""}`,
    );
  }

  const entrouNoIntervalo =
    antes.descricao !== "Halftime" && agora.descricao === "Halftime";
  if (entrouNoIntervalo) {
    linhas.push(`⏸ <b>Intervalo</b> — ${textoDoPlacar(agora)}`);
  }

  if (antes.estado !== "post" && agora.estado === "post") {
    linhas.push(`🏁 <b>Fim de jogo</b> — ${textoDoPlacar(agora)}`);
  }

  return linhas;
}

/**
 * Assinatura do que a página mostra. Muda quando muda gol, estado da partida,
 * formação, titular ou substituição — e só então o ciclo escreve.
 */
export function assinaturaDoJogo(resumo: EspnResumoDoPlantao): string {
  const competicao = resumo.header?.competitions?.[0];
  const estado = competicao?.status?.type?.state ?? "";
  const placares = (competicao?.competitors ?? [])
    .map((c) => `${c.homeAway}=${placar(c.score) ?? ""}`)
    .join(",");
  const elencos = (resumo.rosters ?? [])
    .map((r) => {
      const atletas = (r.roster ?? [])
        .map((a) => `${a.starter ? "T" : "R"}${a.athlete?.displayName ?? ""}>${a.subbedOutFor?.athlete?.displayName ?? ""}`)
        .join("|");
      return `${r.homeAway}:${r.formation ?? ""}:${atletas}`;
    })
    .join(";");
  return `${estado}#${placares}#${elencos}`;
}

/** Estado da ESPN que significa "acabou". */
export function encerrado(resumo: EspnResumoDoPlantao): boolean {
  return resumo.header?.competitions?.[0]?.status?.type?.state === "post";
}

