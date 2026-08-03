"use server";

import { and, eq, lineups, matches } from "@netfor/db";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSessao } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { lerEscalacao } from "@/modules/lineups/entrada";

/**
 * Escalação pelo painel — o plano B de dia de jogo.
 *
 * Tudo que é gravado aqui nasce com `origin: "manual"`, e a coleta da ESPN pula
 * lado marcado assim. É o que faz o painel valer de verdade como fallback: sem a
 * trava, o cron apagaria o trabalho do operador na meia hora seguinte.
 */

function revalidar() {
  revalidateTag("lineups", "max");
}

function ehLado(v: FormDataEntryValue | null): v is "home" | "away" {
  return v === "home" || v === "away";
}

export async function salvarEscalacao(dados: FormData): Promise<void> {
  await exigirSessao();

  const matchId = Number(dados.get("matchId"));
  const lado = dados.get("lado");
  if (!Number.isInteger(matchId) || !ehLado(lado)) redirect("/admin/escalacao");

  const [jogo] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!jogo) redirect("/admin/escalacao");

  const { jogadores, titulares } = lerEscalacao(
    String(dados.get("titulares") ?? ""),
    String(dados.get("banco") ?? ""),
  );

  const destino = `/admin/escalacao/${matchId}`;

  // Sem nenhum titular não há escalação — gravar criaria um campo vazio no site.
  if (titulares === 0) redirect(`${destino}?erro=vazio`);

  const valores = {
    teamName: String(dados.get("time") ?? "").trim() || (lado === "home" ? jogo.homeTeam : jogo.awayTeam),
    // O escudo continua vindo do jogo: é dado da ESPN que não muda e não faz
    // sentido pedir ao operador.
    teamLogo: lado === "home" ? jogo.homeLogo : jogo.awayLogo,
    formation: String(dados.get("formacao") ?? "").trim() || null,
    players: jogadores,
    origin: "manual" as const,
    updatedAt: new Date(),
  };

  await db
    .insert(lineups)
    .values({ matchId, side: lado, ...valores })
    .onConflictDoUpdate({ target: [lineups.matchId, lineups.side], set: valores });

  revalidar();
  redirect(`${destino}?salvo=${lado}&titulares=${titulares}`);
}

/**
 * Devolve o lado ao automático.
 *
 * Apaga a linha em vez de só trocar `origin` de volta: deixá-la como `espn` com
 * o conteúdo digitado faria a coleta comparar contra um dado que não é dela e,
 * se por acaso batesse, nunca corrigir. Sem linha, a próxima coleta grava do
 * zero — que é exatamente o que "voltar ao automático" quer dizer.
 */
export async function voltarAoAutomatico(dados: FormData): Promise<void> {
  await exigirSessao();

  const matchId = Number(dados.get("matchId"));
  const lado = dados.get("lado");
  if (!Number.isInteger(matchId) || !ehLado(lado)) redirect("/admin/escalacao");

  await db.delete(lineups).where(and(eq(lineups.matchId, matchId), eq(lineups.side, lado)));

  revalidar();
  redirect(`/admin/escalacao/${matchId}?automatico=${lado}`);
}
