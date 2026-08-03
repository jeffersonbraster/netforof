import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";
import { formatKickoff, formatShortDateTime } from "@/lib/format";
import { listarJogosDoPainel } from "@/modules/admin/queries";
import { nomeParaOCampo, posicionarTitulares } from "@/modules/lineups/campo";
import { listarEscalacoesRecentes } from "@/modules/lineups/queries";
import type { EscalacaoDoJogo } from "@/modules/lineups/queries";
import type { Lineup, Match } from "@netfor/db";

import { BotaoLink, Cartao, Selo, TituloDaTela, Vazio } from "../ui";

export default function EscalacaoAdminPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Painel />
    </Suspense>
  );
}

/**
 * Resumo de um lado. A contagem é o diagnóstico: 11 significa escalação boa.
 * Qualquer outro número aponta coleta incompleta ou digitação pela metade, e é o
 * primeiro lugar onde se olha quando a página pública sai errada.
 */
function LadoResumido({ escalacao }: { escalacao: Lineup }) {
  const titulares = posicionarTitulares(escalacao.players, escalacao.formation);
  const completo = titulares.length === 11;

  return (
    <div className="rounded-[--radius-card] border border-line bg-surface-2 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{escalacao.teamName}</span>
        <span className="font-display shrink-0 text-xs tracking-widest text-muted tabular-nums">
          {escalacao.formation ?? "sem formação"}
        </span>
      </div>
      <p className="text-xs text-muted">
        <span className={completo ? "" : "text-primary-text"}>{titulares.length} em campo</span> ·{" "}
        {escalacao.players.filter((p) => !p.titular).length} no banco ·{" "}
        {escalacao.origin === "manual" ? "manual" : "ESPN"} ·{" "}
        {formatShortDateTime(escalacao.updatedAt)}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        {titulares.map((p) => nomeParaOCampo(p)).join(" · ")}
      </p>
    </div>
  );
}

function LinhaDeJogo({
  jogo,
  escalacao,
  aoVivo = false,
}: {
  jogo: Match;
  escalacao?: EscalacaoDoJogo;
  aoVivo?: boolean;
}) {
  const casa = escalacao?.casa ?? null;
  const fora = escalacao?.fora ?? null;
  const temAlgo = casa !== null || fora !== null;

  return (
    <Cartao className={`p-4 ${aoVivo ? "border-primary/50" : ""}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display truncate font-bold">
            {jogo.homeTeam} × {jogo.awayTeam}
          </p>
          <p className="text-xs text-muted">
            {jogo.competition} · {formatKickoff(jogo.kickoffAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {jogo.status === "live" && <Selo tom="vivo">Ao vivo</Selo>}
          <BotaoLink
            href={`/admin/escalacao/${jogo.id}`}
            variante={temAlgo ? "secundario" : "primario"}
          >
            {temAlgo ? "Editar" : "Escalar à mão"}
          </BotaoLink>
        </div>
      </div>

      {temAlgo ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {casa ? (
            <LadoResumido escalacao={casa} />
          ) : (
            <p className="text-xs text-muted">{jogo.homeTeam}: sem escalação.</p>
          )}
          {fora ? (
            <LadoResumido escalacao={fora} />
          ) : (
            <p className="text-xs text-muted">{jogo.awayTeam}: sem escalação.</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Nenhuma escalação ainda. A ESPN publica cerca de uma hora antes do apito — se atrasar,
          escale à mão.
        </p>
      )}
    </Cartao>
  );
}

async function Painel() {
  if (!(await sessaoValida())) redirect("/admin/login");

  const [recentes, jogos] = await Promise.all([
    listarEscalacoesRecentes(8),
    listarJogosDoPainel(),
  ]);

  const porJogo = new Map(recentes.map((r) => [r.jogo.id, r]));

  // Jogos que interessam agora: em campo e os próximos. É onde o operador vai
  // precisar agir, com ou sem a ESPN.
  const emPauta = [...jogos.emCampo, ...jogos.proximos.slice(0, 3)];
  const idsEmPauta = new Set(emPauta.map((j) => j.id));
  const historico = recentes.filter((r) => !idsEmPauta.has(r.jogo.id));

  return (
    <>
      <TituloDaTela descricao="A ESPN preenche sozinha cerca de uma hora antes do apito. Se ela atrasar ou vier errada, escale à mão — o que você salvar aqui trava o lado, e a coleta deixa de sobrescrever.">
        Escalação
      </TituloDaTela>

      <section className="mb-8">
        <h2 className="font-display mb-3 text-sm font-bold tracking-widest uppercase">
          Em pauta
        </h2>
        {emPauta.length === 0 ? (
          <Vazio>Nenhum jogo em campo nem agendado à frente.</Vazio>
        ) : (
          <div className="space-y-3">
            {emPauta.map((jogo) => (
              <LinhaDeJogo
                key={jogo.id}
                jogo={jogo}
                escalacao={porJogo.get(jogo.id)}
                aoVivo={jogos.emCampo.some((j) => j.id === jogo.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display mb-3 text-sm font-bold tracking-widest uppercase">
          Já coletadas
        </h2>
        {historico.length === 0 ? (
          <Vazio>Nenhuma escalação coletada ainda.</Vazio>
        ) : (
          <div className="space-y-3">
            {historico.map((r) => (
              <LinhaDeJogo key={r.jogo.id} jogo={r.jogo} escalacao={r} />
            ))}
          </div>
        )}
      </section>

      <p className="mt-6 text-xs text-muted">
        <Link href="/escalacao" target="_blank" className="text-link hover:underline">
          ver a página pública ↗
        </Link>{" "}
        — ela mostra a escalação do jogo mais recente enquanto ele tem menos de 8 horas.
      </p>
    </>
  );
}
