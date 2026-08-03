import { eq, lineups, matches, type Lineup, type Match } from "@netfor/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { CampoDeEscalacao } from "@/components/lineups/campo";
import { sessaoValida } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { formatKickoff, formatShortDateTime } from "@/lib/format";
import { posicionarTitulares } from "@/modules/lineups/campo";
import { escreverEscalacao } from "@/modules/lineups/entrada";

import { AreaDeTexto, Aviso, Botao, Campo, Cartao, Entrada, Selo, TituloDaTela } from "../../ui";
import { salvarEscalacao, voltarAoAutomatico } from "../actions";

type Params = Promise<{ matchId: string }>;
type Busca = Promise<{ salvo?: string; erro?: string; automatico?: string; titulares?: string }>;

export default function EditarEscalacaoPage(props: { params: Params; searchParams: Busca }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Tela {...props} />
    </Suspense>
  );
}

/**
 * Editor de um lado.
 *
 * Duas caixas de texto em vez de trinta e três campinhos: isto é ferramenta de
 * dia de jogo, quando a ESPN atrasou e o time já está em campo. Digitar corrido
 * (ou colar) é o gesto rápido; formulário campo a campo é lento no celular e
 * impossível de colar.
 */
function EditorDeLado({
  jogo,
  lado,
  escalacao,
}: {
  jogo: Match;
  lado: "home" | "away";
  escalacao: Lineup | null;
}) {
  const time = lado === "home" ? jogo.homeTeam : jogo.awayTeam;
  const manual = escalacao?.origin === "manual";
  const emCampo = escalacao ? posicionarTitulares(escalacao.players, escalacao.formation).length : 0;

  return (
    <Cartao className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="min-w-0">
          <h2 className="font-display truncate text-lg font-extrabold tracking-tight uppercase">
            {time}
          </h2>
          <p className="text-xs text-muted">
            {lado === "home" ? "Mandante" : "Visitante"}
            {escalacao && ` · ${emCampo} em campo · atualizada ${formatShortDateTime(escalacao.updatedAt)}`}
          </p>
        </div>
        <Selo tom={manual ? "ativo" : "neutro"}>{manual ? "Manual" : "Automática (ESPN)"}</Selo>
      </div>

      <form action={salvarEscalacao} className="space-y-4">
        <input type="hidden" name="matchId" value={jogo.id} />
        <input type="hidden" name="lado" value={lado} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id={`time-${lado}`} rotulo="Nome do time">
            <Entrada
              id={`time-${lado}`}
              name="time"
              defaultValue={escalacao?.teamName ?? time}
              maxLength={60}
            />
          </Campo>
          <Campo
            id={`formacao-${lado}`}
            rotulo="Formação"
            dica="É ela que define o tamanho de cada linha no campo. Em branco, o desenho é deduzido das posições."
          >
            <Entrada
              id={`formacao-${lado}`}
              name="formacao"
              defaultValue={escalacao?.formation ?? ""}
              placeholder="4-3-3"
              aria-describedby={`formacao-${lado}-dica`}
            />
          </Campo>
        </div>

        <Campo
          id={`titulares-${lado}`}
          rotulo="Titulares — um por linha"
          obrigatorio
          dica={
            <>
              Formato: <code className="text-foreground">número nome posição</code> — número e
              posição são opcionais. Ex.: <code className="text-foreground">1 J. Ricardo G</code>.
              Use o nome CURTO, é ele que aparece no campo. Sem posição o jogador entra, mas cai
              no meio do campo.
              <br />
              Posições: G · CD · LB · RB · DM · CM · LM · RM · AM · CF · LF · RF · F — com sufixo{" "}
              <code className="text-foreground">-L</code> ou <code className="text-foreground">-R</code>{" "}
              para lado (CD-L, AM-R).
            </>
          }
        >
          <AreaDeTexto
            id={`titulares-${lado}`}
            name="titulares"
            rows={12}
            defaultValue={escalacao ? escreverEscalacao(escalacao.players, true) : ""}
            placeholder={"1 J. Ricardo G\n22 Maílton RB\n3 L. Gazal CD-L"}
            aria-describedby={`titulares-${lado}-dica`}
            className="font-mono text-[13px]"
          />
        </Campo>

        <Campo id={`banco-${lado}`} rotulo="Banco — um por linha">
          <AreaDeTexto
            id={`banco-${lado}`}
            name="banco"
            rows={6}
            defaultValue={escalacao ? escreverEscalacao(escalacao.players, false) : ""}
            className="font-mono text-[13px]"
          />
        </Campo>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <Botao type="submit" variante="primario">
            Salvar escalação
          </Botao>
          <p className="text-xs text-muted">
            Salvar trava este lado: a coleta da ESPN passa a não sobrescrever.
          </p>
        </div>
      </form>

      {manual && (
        <form
          action={voltarAoAutomatico}
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3"
        >
          <input type="hidden" name="matchId" value={jogo.id} />
          <input type="hidden" name="lado" value={lado} />
          <Botao type="submit" variante="perigo">
            Voltar ao automático
          </Botao>
          <p className="text-xs text-muted">
            Apaga o que foi digitado e devolve o lado para a coleta da ESPN.
          </p>
        </form>
      )}
    </Cartao>
  );
}

async function Tela({ params, searchParams }: { params: Params; searchParams: Busca }) {
  if (!(await sessaoValida())) redirect("/admin/login");

  const { matchId } = await params;
  const { salvo, erro, automatico, titulares } = await searchParams;
  const numero = Number.parseInt(matchId, 10);
  if (!Number.isInteger(numero)) notFound();

  const [jogo] = await db.select().from(matches).where(eq(matches.id, numero)).limit(1);
  if (!jogo) notFound();

  const lados = await db.select().from(lineups).where(eq(lineups.matchId, numero));
  const casa = lados.find((l) => l.side === "home") ?? null;
  const fora = lados.find((l) => l.side === "away") ?? null;

  const quantos = Number.parseInt(titulares ?? "", 10);

  return (
    <>
      <TituloDaTela
        descricao={`${jogo.competition} · ${formatKickoff(jogo.kickoffAt)}${jogo.stadium ? ` · ${jogo.stadium}` : ""}`}
        acoes={
          <Link
            href="/admin/escalacao"
            className="text-sm whitespace-nowrap text-link hover:underline"
          >
            ← voltar às escalações
          </Link>
        }
      >
        {jogo.homeTeam} × {jogo.awayTeam}
      </TituloDaTela>

      {erro === "vazio" && (
        <Aviso tom="alerta">
          Nenhum titular reconhecido — nada foi salvo. Confira se há pelo menos uma linha com nome
          no campo de titulares.
        </Aviso>
      )}
      {salvo && (
        <Aviso>
          Escalação do {salvo === "home" ? jogo.homeTeam : jogo.awayTeam} salva
          {Number.isInteger(quantos) ? ` com ${quantos} titular${quantos === 1 ? "" : "es"}` : ""}. A
          coleta da ESPN não sobrescreve mais este lado.
          {Number.isInteger(quantos) && quantos !== 11 && (
            <span className="text-primary-text">
              {" "}
              Atenção: {quantos} em vez de 11 — o campo vai sair incompleto.
            </span>
          )}
        </Aviso>
      )}
      {automatico && (
        <Aviso>
          Lado devolvido à coleta automática. A próxima rodada da ESPN preenche de novo.
        </Aviso>
      )}

      <div className="space-y-6">
        <EditorDeLado jogo={jogo} lado="home" escalacao={casa} />
        <EditorDeLado jogo={jogo} lado="away" escalacao={fora} />
      </div>

      {/*
        Pré-visualização com o MESMO componente da página pública, e não uma
        aproximação: é o único jeito de o operador conferir de fato onde cada
        jogador caiu antes de o torcedor ver.
      */}
      {(casa || fora) && (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="font-display mb-4 text-sm font-bold tracking-widest uppercase">
            Como fica no site
          </h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {casa && <CampoDeEscalacao escalacao={casa} cor="primaria" />}
            {fora && <CampoDeEscalacao escalacao={fora} cor="secundaria" />}
          </div>
        </section>
      )}
    </>
  );
}
