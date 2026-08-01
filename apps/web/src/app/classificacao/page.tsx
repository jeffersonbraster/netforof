import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";

import { SectionTitle } from "@/components/ui/section-title";
import { formatShortDateTime } from "@/lib/format";
import { getCampanhaDeCopas, getStandings } from "@/modules/matches/queries";

export const metadata: Metadata = {
  alternates: { canonical: "/classificacao" },
  title: "Classificação — Brasileirão Série B",
  description:
    "Tabela completa do Brasileirão Série B com a campanha do Fortaleza: pontos, jogos, vitórias, saldo de gols e aproveitamento.",
};

export default async function ClassificacaoPage() {
  "use cache";
  cacheTag("standings");
  cacheTag("matches");
  cacheLife("days");

  const [standings, copas] = await Promise.all([getStandings(), getCampanhaDeCopas()]);
  const updatedAt = standings[0]?.updatedAt;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SectionTitle>Classificação — Série B</SectionTitle>
      {updatedAt && (
        <p className="mb-4 text-xs text-muted">Atualizada em {formatShortDateTime(updatedAt)}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted uppercase">
              <th className="px-3 py-2.5 font-medium">#</th>
              <th className="py-2.5 font-medium">Time</th>
              <th className="px-2 py-2.5 text-right font-medium">P</th>
              <th className="px-2 py-2.5 text-right font-medium">J</th>
              <th className="px-2 py-2.5 text-right font-medium">V</th>
              <th className="px-2 py-2.5 text-right font-medium">E</th>
              <th className="px-2 py-2.5 text-right font-medium">D</th>
              <th className="px-2 py-2.5 text-right font-medium">GP</th>
              <th className="px-2 py-2.5 text-right font-medium">GC</th>
              <th className="px-3 py-2.5 text-right font-medium">SG</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => {
              const isFortaleza = row.teamName.toLowerCase().includes("fortaleza");
              const promotion = row.position <= 4;
              const relegation = row.position >= 17;
              return (
                <tr
                  key={row.position}
                  className={`border-b border-line last:border-0 ${
                    isFortaleza ? "bg-primary/10 font-bold" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 tabular-nums">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
                        promotion
                          ? "bg-emerald-500/15 text-emerald-500"
                          : relegation
                            ? "bg-primary/15 text-primary-text"
                            : "text-muted"
                      }`}
                    >
                      {row.position}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-2.5">
                      {row.teamLogo && (
                        <Image
                          src={row.teamLogo}
                          alt=""
                          width={22}
                          height={22}
                          className="size-[22px] object-contain"
                        />
                      )}
                      <span className="truncate">{row.teamName}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                    {row.points}
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted">{row.played}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted">{row.wins}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted">{row.draws}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted">{row.losses}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted">{row.goalsFor}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted">
                    {row.goalsAgainst}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {row.goalsFor - row.goalsAgainst}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Copa é mata-mata: não tem tabela. O que existe e interessa é a
          campanha — jogos disputados e os que vêm. */}
      {copas.map(({ competicao, jogos }) => (
        <section key={competicao} className="mt-10">
          <SectionTitle>{competicao}</SectionTitle>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {jogos.map((jogo) => {
              const encerrado = jogo.status === "finished";
              return (
                <li
                  key={jogo.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
                >
                  <span className="min-w-0 flex-1 font-medium">
                    {jogo.homeTeam}{" "}
                    {encerrado && (
                      <span className="font-display font-bold tabular-nums text-primary-text">
                        {jogo.homeScore} × {jogo.awayScore}
                      </span>
                    )}
                    {!encerrado && <span className="text-muted">×</span>} {jogo.awayTeam}
                  </span>
                  <span className="text-xs text-muted">{formatShortDateTime(jogo.kickoffAt)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500/60" aria-hidden /> Acesso à Série A
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary/60" aria-hidden /> Rebaixamento
        </span>
      </div>
    </div>
  );
}
