/* Hallmark · macrostructure: 19 · Map/Diagram · genre: editorial · design-system: design.md
 * theme: custom tricolor (herdado) · nav: N6 masthead (herdado) · footer: Ft5 (herdado)
 * enrichment: E-Tier-A — campo em CSS puro, sem imagem e sem biblioteca
 * pre-emit critique: P5 H5 E5 S5 R5 V5
 *
 * Map/Diagram é a única macroestrutura da família que descreve esta página: a
 * informação é ESPACIAL. Onde o jogador está no campo É o conteúdo — uma lista
 * de onze nomes diria a mesma coisa e não mostraria nada. É também uma estrutura
 * nova no projeto (o log tinha Ecosystem Index, Index-First, Long Document e
 * Stat-Led), então estende a família em vez de repetir.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CampoDeEscalacao, BancoDeReservas } from "@/components/lineups/campo";
import { formatKickoff } from "@/lib/format";
import { JsonLd } from "@/lib/seo";
import {
  getEscalacaoEmCartaz,
  getJogoAguardandoEscalacao,
} from "@/modules/lineups/queries";

export const metadata: Metadata = {
  alternates: { canonical: "/escalacao" },
  title: "Escalação do Fortaleza",
  description:
    "A escalação do Fortaleza no campo: formação, titulares posicionados, banco e substituições, direto da fonte oficial.",
};

export default function EscalacaoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<Esqueleto />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-8 w-64 bg-surface-2" />
      <div className="mx-auto aspect-[68/105] max-w-md rounded-[--radius-card] bg-surface-2" />
    </div>
  );
}

async function Conteudo() {
  const escalacao = await getEscalacaoEmCartaz();

  if (!escalacao) return <Aguardando />;

  const { jogo, casa, fora } = escalacao;
  const emCasa = jogo.homeTeam.toLowerCase().includes("fortaleza");
  const doLeao = emCasa ? casa : fora;
  const doAdversario = emCasa ? fora : casa;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${jogo.homeTeam} x ${jogo.awayTeam} — ${jogo.competition}`,
    startDate: jogo.kickoffAt.toISOString(),
    sport: "Soccer",
    homeTeam: { "@type": "SportsTeam", name: jogo.homeTeam },
    awayTeam: { "@type": "SportsTeam", name: jogo.awayTeam },
    ...(jogo.stadium ? { location: { "@type": "Place", name: jogo.stadium } } : {}),
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Frase de orientação, não manchete: em Map/Diagram o cabeçalho situa e
          sai da frente — quem carrega a página é o campo. */}
      <header className="regua-marca mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
          Escalação
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {jogo.homeTeam} × {jogo.awayTeam} · {jogo.competition} ·{" "}
          {formatKickoff(jogo.kickoffAt)}
          {jogo.stadium ? ` · ${jogo.stadium}` : ""}
        </p>
      </header>

      {jogo.status !== "scheduled" && jogo.homeScore !== null && jogo.awayScore !== null && (
        <div className="mb-6 flex items-center gap-3 border-l-[3px] border-primary bg-surface px-4 py-3">
          <span className="font-display text-2xl font-extrabold tabular-nums">
            {jogo.homeScore} × {jogo.awayScore}
          </span>
          <span className="text-sm text-muted">
            {jogo.status === "live" ? "Em andamento" : "Encerrado"}
          </span>
        </div>
      )}

      {/*
        O Fortaleza vem SEMPRE primeiro, jogando em casa ou fora. O mando já está
        dito na linha acima ("Palmeiras × Fortaleza · Allianz Parque"); repetir
        isso como título de coluna gastava o lugar mais nobre da seção com
        informação duplicada. O nome do time diz mais, e diz de imediato.
      */}
      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-label={`Escalação do ${doLeao?.teamName ?? "Fortaleza"}`}>
          {doLeao ? (
            <>
              <CampoDeEscalacao escalacao={doLeao} cor="primaria" />
              <BancoDeReservas escalacao={doLeao} />
            </>
          ) : (
            <p className="text-sm text-muted">Escalação do Fortaleza ainda não publicada.</p>
          )}
        </section>

        <section aria-label={`Escalação do ${doAdversario?.teamName ?? "adversário"}`}>
          {doAdversario ? (
            <>
              <CampoDeEscalacao escalacao={doAdversario} cor="secundaria" />
              <BancoDeReservas escalacao={doAdversario} />
            </>
          ) : (
            <p className="text-sm text-muted">Escalação do adversário ainda não publicada.</p>
          )}
        </section>
      </div>

      {/* A legenda que Map/Diagram pede: sem ela, o contorno vazado do jogador
          substituído não quer dizer nada. */}
      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span className="size-3.5 rounded-full bg-[var(--brand-red)]" aria-hidden />
          Fortaleza
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3.5 rounded-full bg-[var(--brand-blue)]" aria-hidden />
          Adversário
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3.5 rounded-full border border-line bg-surface" aria-hidden />
          Substituído
        </span>
      </div>

      <p className="mt-6 text-sm">
        <Link href="/agenda" className="text-link hover:underline">
          Ver a agenda completa →
        </Link>
      </p>
    </>
  );
}

/**
 * Sem escalação publicada.
 *
 * Diz QUANDO a informação chega, em vez de só informar a ausência. "Volte
 * depois" não ajuda ninguém; "cerca de uma hora antes do apito, em 06/08 às
 * 21:30" deixa a pessoa decidir quando voltar.
 */
async function Aguardando() {
  const proximo = await getJogoAguardandoEscalacao();

  return (
    <>
      <header className="regua-marca mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
          Escalação
        </h1>
      </header>

      <div className="rounded-[--radius-card] border border-line bg-surface p-8 text-center">
        {proximo ? (
          <>
            <p className="font-display text-xl font-bold">
              {proximo.homeTeam} × {proximo.awayTeam}
            </p>
            <p className="mt-1 text-sm text-muted">
              {proximo.competition} · {formatKickoff(proximo.kickoffAt)}
              {proximo.stadium ? ` · ${proximo.stadium}` : ""}
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm text-muted">
              Os onze aparecem aqui cerca de uma hora antes do apito inicial, assim que a
              escalação é confirmada — e o campo continua atualizando durante o jogo, a cada
              substituição.
            </p>
          </>
        ) : (
          <p className="text-muted">
            Nenhum jogo na agenda no momento. A escalação aparece assim que o próximo confronto
            for marcado.
          </p>
        )}

        <p className="mt-6 text-sm">
          <Link href="/agenda" className="text-link hover:underline">
            Ver a agenda →
          </Link>
        </p>
      </div>
    </>
  );
}
