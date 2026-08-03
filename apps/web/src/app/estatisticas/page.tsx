import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BarraComparativa } from "@/components/stats/barra-comparativa";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKickoff, formatShortDateTime } from "@/lib/format";
import { breadcrumbJsonLd, JsonLd, SITE_URL } from "@/lib/seo";
import { getEstatisticas, type Recorte } from "@/modules/stats/queries";

export const metadata: Metadata = {
  alternates: { canonical: "/estatisticas" },
  title: "Estatísticas do Fortaleza",
  description:
    "Números reais do Fortaleza jogo a jogo: aproveitamento em casa e fora, frequência de over/under, ambas marcam, jogos sem sofrer gol e forma recente.",
};

/* Hallmark · macrostructure: 04 Stat-Led · genre: editorial · design-system: design.md
 * theme: custom tricolor (herdado) · nav: N6 · footer: Ft5 · enrichment: none
 * pre-emit critique: P5 H5 E4 S5 R5 V4
 */

/**
 * Macroestrutura `04 · Stat-Led`, dentro do sistema travado em design.md.
 *
 * O design.md previa Index-First para páginas de dados. Aqui não serve: agenda e
 * classificação SÃO listas, esta página é um argumento sustentado por um número.
 * O próprio arquivo autoriza estender o sistema quando ele precisa crescer, e a
 * extensão é só a macroestrutura — tema, tipografia, formas, nav e rodapé
 * continuam os mesmos do resto do portal.
 *
 * Nenhum número desta página é estimado. Todo percentual mostra o denominador ao
 * lado ("5 de 19") para o leitor poder conferir a conta.
 */
export default function EstatisticasPage() {
  return (
    <Suspense fallback={<Esqueleto />}>
      <Painel />
    </Suspense>
  );
}

function pct(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}

function media(total: number, jogos: number): string {
  return jogos === 0 ? "0,00" : (total / jogos).toFixed(2).replace(".", ",");
}

/** "5 de 19" — o denominador é o que separa estatística de alegação. */
function fracao(parte: number, total: number): string {
  return `${parte} de ${total}`;
}

/**
 * Nome curto da competição para a coluna estreita da lista de jogos.
 * "Brasileirão Série B" inteiro quebrava em duas linhas e desalinhava a lista.
 * Quem não estiver mapeado cai no nome original, truncado por CSS.
 */
const APELIDO_DE_COMPETICAO: Record<string, string> = {
  "Brasileirão Série B": "Série B",
  "Copa do Nordeste": "Nordeste",
  "Copa do Brasil": "Copa do BR",
};

function abreviar(competicao: string): string {
  return APELIDO_DE_COMPETICAO[competicao] ?? competicao;
}

function Esqueleto() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="mt-8 h-32 w-3/4" />
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Número grande com o denominador logo abaixo — nunca um percentual solto. */
function Numero({ valor, rotulo, detalhe }: { valor: string; rotulo: string; detalhe: string }) {
  return (
    <div className="border-t-2 border-line pt-3">
      <p className="font-display text-4xl leading-none font-extrabold tabular-nums">{valor}</p>
      <p className="mt-1.5 font-display text-xs font-bold tracking-wide uppercase">{rotulo}</p>
      <p className="mt-0.5 text-xs text-muted">{detalhe}</p>
    </div>
  );
}

function LinhaDeMercado({
  mercado,
  geral,
  casa,
  fora,
  extrair,
}: {
  mercado: string;
  geral: Recorte;
  casa: Recorte;
  fora: Recorte;
  extrair: (r: Recorte) => number;
}) {
  const celula = (r: Recorte) => (
    <td className="px-3 py-2.5 text-right tabular-nums">
      <span className="font-semibold">{pct(extrair(r), r.jogos)}%</span>
      <span className="ml-1.5 text-xs text-muted">{fracao(extrair(r), r.jogos)}</span>
    </td>
  );

  return (
    <tr className="border-b border-line last:border-0">
      <th scope="row" className="px-3 py-2.5 text-left font-medium">
        {mercado}
      </th>
      {celula(geral)}
      {celula(casa)}
      {celula(fora)}
    </tr>
  );
}

async function Painel() {
  const e = await getEstatisticas();
  const emCasa = e.mandoDoProximo === "casa";
  const recorte = emCasa ? e.casa : e.fora;
  const oposto = emCasa ? e.fora : e.casa;

  const adversario = e.proximo
    ? e.proximo.homeTeam.includes("Fortaleza")
      ? e.proximo.awayTeam
      : e.proximo.homeTeam
    : null;

  const estatisticasJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Estatísticas do Fortaleza EC por jogo",
    description:
      "Aproveitamento, média de gols, frequência de over/under, ambas marcam e jogos sem sofrer gol do Fortaleza EC, apurados jogo a jogo.",
    url: `${SITE_URL}/estatisticas`,
    creator: { "@type": "Organization", name: "NETFOR", url: SITE_URL },
    isAccessibleForFree: true,
    // Recomendado do `Dataset`, e o que o Search Console cobrava aqui ("o campo
    // license não foi encontrado"). Aviso não crítico: nada saiu do índice, mas
    // sem ele a página fica de fora do Google Dataset Search, que é justo o
    // público que procura número de time. A URL precisa CAIR num texto que
    // descreva a licença — daí a âncora, e não /termos solto.
    license: `${SITE_URL}/termos#licenca`,
    ...(e.atualizadoEm && { dateModified: e.atualizadoEm.toISOString() }),
  };

  return (
    <>
      <JsonLd data={estatisticasJsonLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Início", url: "/" },
          { name: "Estatísticas", url: "/estatisticas" },
        ])}
      />

      {/* Faixa do próximo jogo — reta, hard edge, na âncora azul do tricolor.
          É o contexto de tudo que vem depois: os recortes são escolhidos pelo
          mando DESTE jogo. */}
      <section className="bg-secondary text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4">
          {e.proximo ? (
            <>
              <span className="bg-primary px-2 py-0.5 font-display text-[11px] font-bold tracking-wide uppercase">
                Próximo jogo
              </span>
              <p className="font-display text-lg leading-none font-extrabold tracking-tight uppercase sm:text-xl">
                {e.proximo.homeTeam} <span className="text-white/60">×</span> {e.proximo.awayTeam}
              </p>
              <p className="text-xs text-white/80">
                {e.proximo.competition} · {formatKickoff(e.proximo.kickoffAt)}
                {e.proximo.stadium && ` · ${e.proximo.stadium}`}
              </p>
            </>
          ) : (
            <p className="font-display text-lg font-extrabold uppercase">
              Sem jogo agendado no momento
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* HERO Stat-Led: o número é o maior elemento, mas nunca sozinho —
            vem colado à frase que diz o que ele significa. */}
        <section>
          <p className="font-display text-xs font-bold tracking-wide text-primary-text uppercase">
            {emCasa ? "Com o Leão em casa" : "Com o Leão fora de casa"}
          </p>
          <p className="mt-2 font-display text-[5rem] leading-[0.85] font-extrabold tracking-tight tabular-nums sm:text-[7rem]">
            {pct(recorte.over25, recorte.jogos)}%
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-2xl leading-tight font-extrabold tracking-tight uppercase sm:text-3xl">
            dos jogos {emCasa ? "em casa" : "fora"} passaram de 2,5 gols
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
            Foram {fracao(recorte.over25, recorte.jogos)} partidas.{" "}
            {emCasa ? "Fora de casa" : "Em casa"}, a marca é de{" "}
            <strong className="font-semibold text-foreground">
              {pct(oposto.over25, oposto.jogos)}%
            </strong>{" "}
            ({fracao(oposto.over25, oposto.jogos)}). É o contraste que organiza esta página.
          </p>
          <p className="mt-4 inline-block border border-line px-3 py-1.5 text-xs text-muted">
            Frequência do que já aconteceu — não é previsão nem recomendação.
          </p>
        </section>

        {/* Recorte do mando do próximo jogo. */}
        <section className="mt-12">
          <h2 className="regua-marca font-display text-2xl leading-none font-extrabold tracking-tight uppercase">
            {emCasa ? "Em casa" : "Fora de casa"} — {recorte.jogos} jogos
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Numero
              valor={`${pct(recorte.vitorias, recorte.jogos)}%`}
              rotulo="Vitórias"
              detalhe={`${recorte.vitorias}V · ${recorte.empates}E · ${recorte.derrotas}D`}
            />
            <Numero
              valor={media(recorte.golsPro + recorte.golsContra, recorte.jogos)}
              rotulo="Gols por jogo"
              detalhe={`${media(recorte.golsPro, recorte.jogos)} marcados · ${media(recorte.golsContra, recorte.jogos)} sofridos`}
            />
            <Numero
              valor={`${pct(recorte.ambasMarcam, recorte.jogos)}%`}
              rotulo="Ambas marcam"
              detalhe={fracao(recorte.ambasMarcam, recorte.jogos)}
            />
            <Numero
              valor={`${pct(recorte.semSofrer, recorte.jogos)}%`}
              rotulo="Sem sofrer gol"
              detalhe={fracao(recorte.semSofrer, recorte.jogos)}
            />
          </div>
        </section>

        {/* A comparação que carrega a página. */}
        <section className="mt-12">
          <h2 className="regua-marca font-display text-2xl leading-none font-extrabold tracking-tight uppercase">
            Castelão × estrada
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {e.casa.jogos} jogos em casa e {e.fora.jogos} fora, em todas as competições da
            temporada. São dois times diferentes.
          </p>
          <div className="mt-5">
            <BarraComparativa
              metrica="Aproveitamento de vitórias"
              casa={pct(e.casa.vitorias, e.casa.jogos)}
              fora={pct(e.fora.vitorias, e.fora.jogos)}
              detalheCasa={`${fracao(e.casa.vitorias, e.casa.jogos)} vitórias`}
              detalheFora={`${fracao(e.fora.vitorias, e.fora.jogos)} vitórias`}
            />
            <BarraComparativa
              metrica="Gols por jogo (soma das duas equipes)"
              casa={Number(
                media(e.casa.golsPro + e.casa.golsContra, e.casa.jogos).replace(",", "."),
              )}
              fora={Number(
                media(e.fora.golsPro + e.fora.golsContra, e.fora.jogos).replace(",", "."),
              )}
              sufixo=""
              detalheCasa={`${e.casa.golsPro} marcados · ${e.casa.golsContra} sofridos`}
              detalheFora={`${e.fora.golsPro} marcados · ${e.fora.golsContra} sofridos`}
            />
            <BarraComparativa
              metrica="Jogos com mais de 2,5 gols"
              casa={pct(e.casa.over25, e.casa.jogos)}
              fora={pct(e.fora.over25, e.fora.jogos)}
              detalheCasa={fracao(e.casa.over25, e.casa.jogos)}
              detalheFora={fracao(e.fora.over25, e.fora.jogos)}
            />
            <BarraComparativa
              metrica="Jogos em que o Leão não marcou"
              casa={pct(e.casa.semMarcar, e.casa.jogos)}
              fora={pct(e.fora.semMarcar, e.fora.jogos)}
              detalheCasa={fracao(e.casa.semMarcar, e.casa.jogos)}
              detalheFora={fracao(e.fora.semMarcar, e.fora.jogos)}
            />
          </div>
        </section>

        {/* Tabela de frequências. */}
        <section className="mt-12">
          <h2 className="regua-marca font-display text-2xl leading-none font-extrabold tracking-tight uppercase">
            Com que frequência aconteceu
          </h2>
          <div className="mt-5 overflow-x-auto rounded-[--radius-card] border border-line bg-surface">
            <table className="w-full min-w-[560px] text-sm">
              <caption className="sr-only">
                Frequência de cada ocorrência nos jogos do Fortaleza, por mando de campo
              </caption>
              <thead>
                <tr className="border-b border-line text-[11px] tracking-wide text-muted uppercase">
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">
                    Ocorrência
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Geral ({e.geral.jogos})
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Casa ({e.casa.jogos})
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Fora ({e.fora.jogos})
                  </th>
                </tr>
              </thead>
              <tbody>
                <LinhaDeMercado
                  mercado="Mais de 1,5 gol"
                  geral={e.geral}
                  casa={e.casa}
                  fora={e.fora}
                  extrair={(r) => r.over15}
                />
                <LinhaDeMercado
                  mercado="Mais de 2,5 gols"
                  geral={e.geral}
                  casa={e.casa}
                  fora={e.fora}
                  extrair={(r) => r.over25}
                />
                <LinhaDeMercado
                  mercado="Mais de 3,5 gols"
                  geral={e.geral}
                  casa={e.casa}
                  fora={e.fora}
                  extrair={(r) => r.over35}
                />
                <LinhaDeMercado
                  mercado="Ambas as equipes marcam"
                  geral={e.geral}
                  casa={e.casa}
                  fora={e.fora}
                  extrair={(r) => r.ambasMarcam}
                />
                <LinhaDeMercado
                  mercado="Fortaleza não sofreu gol"
                  geral={e.geral}
                  casa={e.casa}
                  fora={e.fora}
                  extrair={(r) => r.semSofrer}
                />
                <LinhaDeMercado
                  mercado="Fortaleza não marcou"
                  geral={e.geral}
                  casa={e.casa}
                  fora={e.fora}
                  extrair={(r) => r.semMarcar}
                />
                <LinhaDeMercado
                  mercado="Vitória do Fortaleza"
                  geral={e.geral}
                  casa={e.casa}
                  fora={e.fora}
                  extrair={(r) => r.vitorias}
                />
              </tbody>
            </table>
          </div>
        </section>

        {/* Forma. */}
        <section className="mt-12">
          <h2 className="regua-marca font-display text-2xl leading-none font-extrabold tracking-tight uppercase">
            Forma — últimos {e.forma.length} jogos
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[...e.forma].reverse().map((j, i) => (
              <span
                key={`${j.data.toISOString()}-${i}`}
                title={`${j.adversario} ${j.golsPro}–${j.golsContra}`}
                className={`flex size-8 items-center justify-center font-display text-sm font-extrabold text-white ${
                  j.resultado === "V"
                    ? "bg-emerald-600"
                    : j.resultado === "E"
                      ? "bg-muted"
                      : "bg-primary"
                }`}
              >
                {j.resultado}
              </span>
            ))}
            <span className="ml-1 text-xs text-muted">mais antigo → mais recente</span>
          </div>
          <p className="mt-3 text-sm text-muted">
            {e.invencibilidade > 1 && (
              <>
                Sequência atual sem perder:{" "}
                <strong className="font-semibold text-foreground">{e.invencibilidade} jogos</strong>
                .{" "}
              </>
            )}
            {/* Tendência recente contra a temporada: é o que diz se o número
                grande lá em cima ainda descreve o time de hoje. */}
            Nos últimos {e.ultimos5.jogos} jogos saíram{" "}
            <strong className="font-semibold text-foreground">
              {media(e.ultimos5.golsPro + e.ultimos5.golsContra, e.ultimos5.jogos)} gols por jogo
            </strong>
            , contra {media(e.geral.golsPro + e.geral.golsContra, e.geral.jogos)} na temporada.
          </p>
          <ul className="mt-5 divide-y divide-line rounded-[--radius-card] border border-line bg-surface">
            {e.forma.map((j, i) => (
              <li
                key={`${j.data.toISOString()}-${i}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
              >
                <span className="w-14 shrink-0 text-xs text-muted tabular-nums">
                  {formatShortDateTime(j.data).split(",")[0]}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {j.emCasa ? "" : "@ "}
                  {j.adversario}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {j.golsPro}–{j.golsContra}
                </span>
                <span className="w-20 shrink-0 truncate text-right text-xs text-muted">
                  {abreviar(j.competicao)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Posição e adversário. */}
        <section className="mt-12 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="regua-marca font-display text-2xl leading-none font-extrabold tracking-tight uppercase">
              Na Série B
            </h2>
            {e.fortalezaNaTabela ? (
              <dl className="mt-4 divide-y divide-line rounded-[--radius-card] border border-line bg-surface">
                <div className="flex items-baseline justify-between px-3 py-2.5">
                  <dt className="text-sm text-muted">Posição</dt>
                  <dd className="font-display text-xl font-extrabold tabular-nums">
                    {e.fortalezaNaTabela.position}º
                  </dd>
                </div>
                <div className="flex items-baseline justify-between px-3 py-2.5">
                  <dt className="text-sm text-muted">Pontos</dt>
                  <dd className="font-display text-xl font-extrabold tabular-nums">
                    {e.fortalezaNaTabela.points}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between px-3 py-2.5">
                  <dt className="text-sm text-muted">Aproveitamento</dt>
                  <dd className="font-display text-xl font-extrabold tabular-nums">
                    {pct(e.fortalezaNaTabela.points, e.fortalezaNaTabela.played * 3)}%
                  </dd>
                </div>
                {e.paraOG4 !== null && (
                  <div className="flex items-baseline justify-between px-3 py-2.5">
                    <dt className="text-sm text-muted">Para o G4</dt>
                    <dd className="font-display text-xl font-extrabold tabular-nums">
                      {e.paraOG4} pt{e.paraOG4 === 1 ? "" : "s"}
                    </dd>
                  </div>
                )}
                {e.sobreOZ4 !== null && (
                  <div className="flex items-baseline justify-between px-3 py-2.5">
                    <dt className="text-sm text-muted">Sobre o Z4</dt>
                    <dd className="font-display text-xl font-extrabold tabular-nums">
                      +{e.sobreOZ4}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-muted">Tabela indisponível no momento.</p>
            )}
          </div>

          <div>
            <h2 className="regua-marca font-display text-2xl leading-none font-extrabold tracking-tight uppercase">
              O adversário
            </h2>
            {e.adversarioNaTabela ? (
              <dl className="mt-4 divide-y divide-line rounded-[--radius-card] border border-line bg-surface">
                <div className="flex items-baseline justify-between px-3 py-2.5">
                  <dt className="text-sm text-muted">{e.adversarioNaTabela.teamName}</dt>
                  <dd className="font-display text-xl font-extrabold tabular-nums">
                    {e.adversarioNaTabela.position}º
                  </dd>
                </div>
                <div className="flex items-baseline justify-between px-3 py-2.5">
                  <dt className="text-sm text-muted">Pontos</dt>
                  <dd className="font-display text-xl font-extrabold tabular-nums">
                    {e.adversarioNaTabela.points}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between px-3 py-2.5">
                  <dt className="text-sm text-muted">Gols marcados / sofridos</dt>
                  <dd className="font-display text-xl font-extrabold tabular-nums">
                    {e.adversarioNaTabela.goalsFor}/{e.adversarioNaTabela.goalsAgainst}
                  </dd>
                </div>
              </dl>
            ) : (
              /* Sem inventar: a tabela que coletamos é a da Série B. Contra time
                 de outra divisão, em copa, não há número nosso para mostrar. */
              <p className="mt-4 rounded-[--radius-card] border border-line bg-surface p-4 text-sm text-muted">
                {adversario
                  ? `Não temos números próprios do ${adversario}: a tabela que o NETFOR coleta é a da Série B, e este jogo é de outra competição.`
                  : "Sem adversário definido no momento."}
              </p>
            )}
          </div>
        </section>

        {/* Placares e competições, lado a lado. */}
        <section className="mt-12 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="regua-marca font-display text-2xl leading-none font-extrabold tracking-tight uppercase">
              Placares que mais se repetiram
            </h2>
            <ul className="mt-4 space-y-2">
              {e.placares.map((p) => (
                <li key={p.placar} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 font-display text-2xl font-extrabold tabular-nums">
                    {p.placar}
                  </span>
                  <span
                    className="h-2.5 bg-primary"
                    style={{ width: `${(p.vezes / e.placares[0]!.vezes) * 60}%` }}
                    aria-hidden
                  />
                  <span className="text-sm text-muted tabular-nums">
                    {p.vezes} {p.vezes === 1 ? "vez" : "vezes"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="regua-marca font-display text-2xl leading-none font-extrabold tracking-tight uppercase">
              Por competição
            </h2>
            <ul className="mt-4 divide-y divide-line rounded-[--radius-card] border border-line bg-surface">
              {e.porCompeticao.map((c) => (
                <li key={c.rotulo} className="px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium">{c.rotulo}</span>
                    <span className="shrink-0 font-display text-lg font-extrabold tabular-nums">
                      {c.vitorias}
                      <span className="text-muted">/</span>
                      {c.empates}
                      <span className="text-muted">/</span>
                      {c.derrotas}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {c.jogos} jogos · {media(c.golsPro, c.jogos)} gol marcado por jogo
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Metodologia e responsabilidade. */}
        <section className="mt-12 border-t border-line pt-6">
          <h2 className="font-display text-sm font-bold tracking-wide uppercase">
            Como estes números são apurados
          </h2>
          <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed text-muted">
            <p>
              Base de {e.geral.jogos} jogos com placar registrado na temporada, em todas as
              competições. A apuração da Série B confere com a tabela oficial
              {e.fortalezaNaTabela &&
                ` (${e.fortalezaNaTabela.played} jogos, ${e.fortalezaNaTabela.wins}V ${e.fortalezaNaTabela.draws}E ${e.fortalezaNaTabela.losses}D)`}
              . Atualização automática após cada rodada
              {e.atualizadoEm && ` — última em ${formatShortDateTime(e.atualizadoEm)}`}.
            </p>
            <p>
              Escanteios, cartões, posse de bola e gols por tempo{" "}
              <strong className="font-semibold text-foreground">não</strong> aparecem aqui porque
              não são coletados. Preferimos a lacuna declarada a um número estimado.
            </p>
            <p>
              Tudo nesta página é{" "}
              <strong className="font-semibold text-foreground">
                frequência do que já aconteceu
              </strong>
              , não probabilidade futura. Desempenho passado não determina resultado de jogo nenhum.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border border-line bg-surface-2 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center bg-primary font-display text-sm font-extrabold text-white">
              18+
            </span>
            <p className="min-w-0 flex-1 text-sm text-muted">
              Conteúdo informativo, para maiores de 18 anos. O NETFOR não é casa de apostas, não
              intermedia apostas e não indica nenhum operador. Aposta não é fonte de renda — se
              virar problema, procure ajuda.
            </p>
          </div>
        </section>

        {/* Fechamento Ft5 — o statement do sistema, virado para patrocínio. */}
        <section className="mt-12 border-t-[3px] border-primary pt-8">
          <p className="max-w-3xl font-display text-4xl leading-[1.05] font-extrabold tracking-tight uppercase sm:text-5xl">
            Dados do Leão, <span className="text-primary-text">atualizados sozinhos.</span>
          </p>
          <p className="mt-4 max-w-xl text-base text-muted">
            Esta página é mantida pela coleta automática do NETFOR e cresce a cada rodada. O espaço
            está aberto a patrocínio.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <a
              href="mailto:contato@netfor.com.br?subject=Patroc%C3%ADnio%20-%20NETFOR%20Estat%C3%ADsticas"
              className="inline-flex h-11 items-center bg-primary px-6 font-display text-sm font-bold tracking-wide text-white uppercase transition-opacity hover:opacity-90"
            >
              Falar sobre patrocínio
            </a>
            <Link
              href="/agenda"
              className="font-display text-sm font-bold tracking-wide text-link uppercase underline-offset-4 hover:underline"
            >
              Ver agenda completa →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
