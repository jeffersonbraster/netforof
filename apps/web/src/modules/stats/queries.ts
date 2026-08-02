import { asc, matches, standings, type Match, type Standing } from "@netfor/db";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";

/**
 * Estatísticas do Fortaleza para a página /estatisticas.
 *
 * Regra que vale para tudo aqui: **nenhum número é estimado**. Cada percentual
 * sai de contagem sobre jogos com placar registrado, e a página mostra o
 * denominador ao lado ("5 de 19") justamente para o leitor poder conferir.
 *
 * A tabela `matches` guarda só jogos do Fortaleza — foi verificado antes de
 * escrever isto (0 registros sem o clube). Por isso o recorte de mando é uma
 * comparação de string em vez de join.
 *
 * O que NÃO existe na base, e por isso não aparece na página: escanteios,
 * cartões, posse, finalizações e gols por tempo. O schema guarda placar final.
 * Inventar esses números seria o oposto do que a página se propõe a ser.
 */

const CLUBE = "Fortaleza";

export interface Recorte {
  /** Rótulo humano do recorte ("Fora de casa", "Série B"). */
  rotulo: string;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  over15: number;
  over25: number;
  over35: number;
  ambasMarcam: number;
  semSofrer: number;
  semMarcar: number;
}

export interface JogoResumo {
  data: Date;
  competicao: string;
  adversario: string;
  emCasa: boolean;
  golsPro: number;
  golsContra: number;
  resultado: "V" | "E" | "D";
}

export interface Estatisticas {
  proximo: Match | null;
  /** Mando do próximo jogo. Sem próximo jogo, cai em "fora" — o recorte mais conservador. */
  mandoDoProximo: "casa" | "fora";
  adversarioNaTabela: Standing | null;
  geral: Recorte;
  casa: Recorte;
  fora: Recorte;
  ultimos5: Recorte;
  porCompeticao: Recorte[];
  forma: JogoResumo[];
  placares: Array<{ placar: string; vezes: number }>;
  invencibilidade: number;
  fortalezaNaTabela: Standing | null;
  /** Distância em pontos para o G4 e para o Z4. Nulo quando a tabela não cobre. */
  paraOG4: number | null;
  sobreOZ4: number | null;
  atualizadoEm: Date | null;
}

function ehDoClube(nome: string): boolean {
  return nome.includes(CLUBE);
}

function resumir(m: Match): JogoResumo | null {
  if (m.homeScore === null || m.awayScore === null) return null;
  const emCasa = ehDoClube(m.homeTeam);
  const golsPro = emCasa ? m.homeScore : m.awayScore;
  const golsContra = emCasa ? m.awayScore : m.homeScore;
  return {
    data: m.kickoffAt,
    competicao: m.competition,
    adversario: emCasa ? m.awayTeam : m.homeTeam,
    emCasa,
    golsPro,
    golsContra,
    resultado: golsPro > golsContra ? "V" : golsPro === golsContra ? "E" : "D",
  };
}

function agregar(rotulo: string, jogos: JogoResumo[]): Recorte {
  const conta = (teste: (j: JogoResumo) => boolean) => jogos.filter(teste).length;
  const soma = (valor: (j: JogoResumo) => number) => jogos.reduce((t, j) => t + valor(j), 0);

  return {
    rotulo,
    jogos: jogos.length,
    vitorias: conta((j) => j.resultado === "V"),
    empates: conta((j) => j.resultado === "E"),
    derrotas: conta((j) => j.resultado === "D"),
    golsPro: soma((j) => j.golsPro),
    golsContra: soma((j) => j.golsContra),
    over15: conta((j) => j.golsPro + j.golsContra > 1.5),
    over25: conta((j) => j.golsPro + j.golsContra > 2.5),
    over35: conta((j) => j.golsPro + j.golsContra > 3.5),
    ambasMarcam: conta((j) => j.golsPro > 0 && j.golsContra > 0),
    semSofrer: conta((j) => j.golsContra === 0),
    semMarcar: conta((j) => j.golsPro === 0),
  };
}

/** Jogos seguidos sem perder, contando do mais recente para trás. */
function contarInvencibilidade(jogos: JogoResumo[]): number {
  let seguidos = 0;
  for (let i = jogos.length - 1; i >= 0; i--) {
    if (jogos[i]!.resultado === "D") break;
    seguidos++;
  }
  return seguidos;
}

export async function getEstatisticas(): Promise<Estatisticas> {
  "use cache";
  // Depende das duas coleções: o scraper revalida `matches` quando o placar muda
  // e `standings` quando a tabela muda.
  cacheTag("matches");
  cacheTag("standings");
  // "hours" e não "days": o corte entre passado e futuro usa `now`, então o
  // resultado envelhece sozinho mesmo sem nada mudar no banco.
  cacheLife("hours");

  const [todos, tabela] = await Promise.all([
    db.select().from(matches).orderBy(asc(matches.kickoffAt)),
    db.select().from(standings).orderBy(asc(standings.position)),
  ]);

  const agora = new Date();
  const proximo = todos.find((m) => m.kickoffAt > agora && m.status !== "finished") ?? null;
  const mandoDoProximo: "casa" | "fora" = proximo && ehDoClube(proximo.homeTeam) ? "casa" : "fora";

  const jogos = todos
    .filter((m) => m.status === "finished")
    .map(resumir)
    .filter((j): j is JogoResumo => j !== null);

  const competicoes = [...new Set(jogos.map((j) => j.competicao))];

  const placares = [
    ...jogos.reduce((mapa, j) => {
      const chave = `${j.golsPro}–${j.golsContra}`;
      return mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
    }, new Map<string, number>()),
  ]
    .map(([placar, vezes]) => ({ placar, vezes }))
    .sort((a, b) => b.vezes - a.vezes)
    .slice(0, 5);

  const fortalezaNaTabela = tabela.find((t) => ehDoClube(t.teamName)) ?? null;
  const adversario = proximo
    ? ehDoClube(proximo.homeTeam)
      ? proximo.awayTeam
      : proximo.homeTeam
    : null;

  // O adversário só tem números quando joga a Série B — é a única competição
  // cuja tabela nós coletamos. Em Copa do Brasil contra time da Série A, não há
  // o que mostrar, e a página diz isso em vez de deixar um bloco vazio.
  const adversarioNaTabela =
    adversario === null
      ? null
      : (tabela.find((t) => t.teamName === adversario) ??
        tabela.find(
          (t) =>
            t.teamName.toLowerCase().includes(adversario.toLowerCase()) ||
            adversario.toLowerCase().includes(t.teamName.toLowerCase()),
        ) ??
        null);

  const quarto = tabela.find((t) => t.position === 4);
  const decimoSetimo = tabela.find((t) => t.position === 17);

  return {
    proximo,
    mandoDoProximo,
    adversarioNaTabela,
    geral: agregar("Todas as competições", jogos),
    casa: agregar(
      "Em casa",
      jogos.filter((j) => j.emCasa),
    ),
    fora: agregar(
      "Fora de casa",
      jogos.filter((j) => !j.emCasa),
    ),
    ultimos5: agregar("Últimos 5 jogos", jogos.slice(-5)),
    porCompeticao: competicoes
      .map((c) =>
        agregar(
          c,
          jogos.filter((j) => j.competicao === c),
        ),
      )
      .sort((a, b) => b.jogos - a.jogos),
    forma: jogos.slice(-10).reverse(),
    placares,
    invencibilidade: contarInvencibilidade(jogos),
    fortalezaNaTabela,
    paraOG4:
      fortalezaNaTabela && quarto && fortalezaNaTabela.position > 4
        ? quarto.points - fortalezaNaTabela.points
        : null,
    sobreOZ4:
      fortalezaNaTabela && decimoSetimo && fortalezaNaTabela.position < 17
        ? fortalezaNaTabela.points - decimoSetimo.points
        : null,
    atualizadoEm: fortalezaNaTabela?.updatedAt ?? null,
  };
}
