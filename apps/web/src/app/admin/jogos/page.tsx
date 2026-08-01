import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";
import { formatKickoff } from "@/lib/format";
import { getAgenda, getRecentResults } from "@/modules/matches/queries";

import { salvarPlacar } from "../actions";

export default function JogosPage({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Painel searchParams={searchParams} />
    </Suspense>
  );
}

async function Painel({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  if (!(await sessaoValida())) redirect("/admin/login");
  const { salvo } = await searchParams;

  const [agenda, recentes] = await Promise.all([getAgenda(), getRecentResults(4)]);
  const jogos = [...recentes, ...agenda.upcoming];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/admin" className="text-sm text-link hover:underline">
          ← Voltar
        </Link>
      </div>

      <h1 className="font-display text-2xl font-extrabold">Placar e estado dos jogos</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        A coleta da ESPN roda por cron e pode atrasar em dia de jogo. Aqui você corrige na hora.
        A coleta seguinte sobrescreve com o dado oficial quando ela atualizar.
      </p>

      {salvo && (
        <p className="mb-4 rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm">
          Placar salvo.
        </p>
      )}

      <ul className="space-y-3">
        {jogos.map((jogo) => (
          <li key={jogo.id} className="rounded-[--radius-card] border border-line bg-surface p-4">
            <p className="mb-1 text-xs tracking-wide text-muted uppercase">
              {jogo.competition} · {formatKickoff(jogo.kickoffAt)}
            </p>
            <form action={salvarPlacar} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={jogo.id} />
              <span className="min-w-40 flex-1 font-display font-bold">{jogo.homeTeam}</span>
              <input
                name="homeScore"
                inputMode="numeric"
                defaultValue={jogo.homeScore ?? ""}
                aria-label={`Gols de ${jogo.homeTeam}`}
                className="w-14 border border-line bg-background px-2 py-1 text-center font-display font-bold tabular-nums"
              />
              <span className="text-muted">×</span>
              <input
                name="awayScore"
                inputMode="numeric"
                defaultValue={jogo.awayScore ?? ""}
                aria-label={`Gols de ${jogo.awayTeam}`}
                className="w-14 border border-line bg-background px-2 py-1 text-center font-display font-bold tabular-nums"
              />
              <span className="min-w-40 flex-1 font-display font-bold">{jogo.awayTeam}</span>
              <select
                name="estado"
                defaultValue={jogo.status}
                aria-label="Estado do jogo"
                className="border border-line bg-background px-2 py-1 text-sm"
              >
                <option value="scheduled">Agendado</option>
                <option value="live">Ao vivo</option>
                <option value="finished">Encerrado</option>
              </select>
              <button
                type="submit"
                className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
              >
                Salvar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
