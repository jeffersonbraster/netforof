import { config } from "dotenv";

config({ path: "../../.env" });

import { articles, createDb, desc, eq, gte, lineups, matches, sql, standings } from "@netfor/db";

import { agoraEmFortaleza, avisoDeFalha, enviarTelegram, escaparHtml, MARCA } from "./core/telegram";

/**
 * Boletim diário.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ELE EXISTE
 * ---------------------------------------------------------------------------
 * Os outros avisos são por evento: só falam quando algo mudou ou quebrou. Isso é
 * o certo para o volume — são ~160 execuções de cron por dia entre os três jobs
 * —, mas deixa um buraco: silêncio passa a significar duas coisas ao mesmo tempo,
 * "não houve novidade" e "está tudo parado há dias". Sem uma delas ser
 * descartável, o silêncio não informa nada.
 *
 * O boletim fecha esse buraco uma vez por dia. E fecha com EVIDÊNCIA, não com
 * "estou vivo": em vez de contar execuções, ele lê o banco e diz há quanto tempo
 * cada coisa foi atualizada. Um job pode rodar sem erro e mesmo assim não estar
 * gravando nada — a contagem de execuções mentiria, o frescor do dado não.
 *
 * ---------------------------------------------------------------------------
 * O QUE É "ATRASADO"
 * ---------------------------------------------------------------------------
 * Cada limite abaixo vem da cadência real do job que alimenta aquele dado, com
 * folga para o GitHub estrangular cron em repositório público. Passar do limite
 * não é erro garantido — é o sinal de onde olhar.
 */

/** A ESPN mexe na tabela quando há rodada; 48h sem toque em temporada ativa é estranho. */
const LIMITE_TABELA_H = 48;
/** O scraper roda 16× por dia entre 8h e 23h; um dia inteiro sem matéria nova é sinal. */
const LIMITE_MATERIAS_H = 24;

function horasDesde(data: Date | null): number | null {
  if (!data) return null;
  return (Date.now() - data.getTime()) / 3_600_000;
}

/** "há 12 min" / "há 3h" / "há 2 dias" — leitura direta, sem conta de cabeça. */
function faz(horas: number | null): string {
  if (horas === null) return "nunca";
  if (horas < 1) return `há ${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 48) return `há ${Math.round(horas)}h`;
  return `há ${Math.round(horas / 24)} dias`;
}

function linha(rotulo: string, valor: string, atrasado: boolean): string {
  return `${atrasado ? "⚠️" : "✓"} <b>${escaparHtml(rotulo)}</b> — ${escaparHtml(valor)}`;
}

async function main() {
  const db = createDb();

  const [
    [jogoRecente],
    [tabelaRecente],
    [materiaRecente],
    [fila],
    [rascunhos],
    [escalacaoRecente],
    [proximoJogo],
  ] = await Promise.all([
    // `updated_at` não existe em matches, então o sinal de frescor é o jogo com
    // kickoff mais recente já encerrado — se a coleta parou, ele para de andar.
    db
      .select({ quando: matches.kickoffAt })
      .from(matches)
      .where(eq(matches.status, "finished"))
      .orderBy(desc(matches.kickoffAt))
      .limit(1),
    db.select({ quando: standings.updatedAt }).from(standings).orderBy(desc(standings.updatedAt)).limit(1),
    db.select({ quando: articles.scrapedAt }).from(articles).orderBy(desc(articles.scrapedAt)).limit(1),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(articles)
      .where(eq(articles.status, "review")),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(articles)
      .where(eq(articles.status, "draft")),
    db.select({ quando: lineups.updatedAt }).from(lineups).orderBy(desc(lineups.updatedAt)).limit(1),
    db
      .select({
        quando: matches.kickoffAt,
        casa: matches.homeTeam,
        fora: matches.awayTeam,
      })
      .from(matches)
      .where(gte(matches.kickoffAt, new Date()))
      .orderBy(matches.kickoffAt)
      .limit(1),
  ]);

  // Matérias publicadas nas últimas 24h: é o número que diz se o portal está
  // vivo para quem chega de fora.
  const [publicadasHoje] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(articles)
    .where(
      sql`${articles.status} = 'published' AND ${articles.publishedAt} >= now() - interval '24 hours'`,
    );

  const hJogos = horasDesde(jogoRecente?.quando ?? null);
  const hTabela = horasDesde(tabelaRecente?.quando ?? null);
  const hMaterias = horasDesde(materiaRecente?.quando ?? null);
  const hEscalacao = horasDesde(escalacaoRecente?.quando ?? null);

  /**
   * O atraso de jogos usa o ÚLTIMO JOGO, não a última execução: fora de rodada é
   * normal passar dias sem jogo encerrado novo. Por isso o alerta só vale quando
   * existe jogo recente esperado — senão acusaria falha em toda semana sem
   * partida.
   */
  const tabelaAtrasada = hTabela !== null && hTabela > LIMITE_TABELA_H;
  const materiasAtrasadas = hMaterias === null || hMaterias > LIMITE_MATERIAS_H;

  const linhas = [
    linha(
      "Coleta de matérias",
      `última ${faz(hMaterias)} · ${publicadasHoje?.total ?? 0} publicadas em 24h`,
      materiasAtrasadas,
    ),
    linha("Classificação", `atualizada ${faz(hTabela)}`, tabelaAtrasada),
    linha(
      "Jogos",
      jogoRecente ? `último encerrado ${faz(hJogos)}` : "nenhum jogo encerrado no banco",
      !jogoRecente,
    ),
    linha(
      "Escalação",
      escalacaoRecente ? `última coleta ${faz(hEscalacao)}` : "nenhuma ainda",
      false,
    ),
  ];

  const filaTotal = fila?.total ?? 0;
  const rascunhosTotal = rascunhos?.total ?? 0;

  const pendencias = [
    filaTotal > 0
      ? `${MARCA.materia} <b>${filaTotal}</b> aguardando revisão — <a href="https://netfor.com.br/admin?estado=review">abrir o painel</a>`
      : null,
    // Rascunho parado é o sintoma clássico de reescrita quebrada: a coleta grava
    // o link e a IA nunca produz o texto.
    rascunhosTotal > 5
      ? `⚠️ <b>${rascunhosTotal}</b> sem texto próprio — a reescrita pode estar falhando.`
      : null,
  ].filter((l) => l !== null);

  const proximo = proximoJogo
    ? `${MARCA.jogos} Próximo jogo: <b>${escaparHtml(`${proximoJogo.casa} × ${proximoJogo.fora}`)}</b> em ${escaparHtml(
        new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Fortaleza",
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(proximoJogo.quando),
      )}`
    : `${MARCA.jogos} Nenhum jogo na agenda.`;

  const mensagem = [
    `${MARCA.boletim} <b>Boletim NETFOR</b> — ${agoraEmFortaleza()}`,
    "",
    linhas.join("\n"),
    "",
    proximo,
    pendencias.length > 0 ? `\n${pendencias.join("\n")}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const enviado = await enviarTelegram(mensagem);
  console.log(mensagem.replace(/<[^>]+>/g, ""));
  if (!enviado) process.exitCode = 1;
}

main().catch(async (erro) => {
  console.error("Erro no boletim:", erro);
  await enviarTelegram(avisoDeFalha("Boletim diário", erro));
  process.exit(1);
});
