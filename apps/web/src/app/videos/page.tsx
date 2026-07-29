import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";

import { SectionTitle } from "@/components/ui/section-title";
import { formatKickoff } from "@/lib/format";
import { getRecentResults } from "@/modules/matches/queries";
import type { Match } from "@netfor/db";

export const metadata: Metadata = {
  title: "Vídeos e Últimos Jogos",
  description:
    "Placares dos últimos jogos do Fortaleza Esporte Clube com links para os melhores momentos.",
};

function highlightsUrl(match: Match): string {
  const query = encodeURIComponent(
    `${match.homeTeam} x ${match.awayTeam} melhores momentos ${match.competition}`,
  );
  return `https://www.youtube.com/results?search_query=${query}`;
}

export default async function VideosPage() {
  "use cache";
  cacheTag("matches");
  cacheLife("hours");

  const results = await getRecentResults(12);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SectionTitle>Últimos Jogos</SectionTitle>
      <p className="mb-6 text-sm text-muted">
        Placares dos jogos mais recentes do Leão — clique para assistir aos melhores momentos.
      </p>

      {results.length === 0 ? (
        <p className="py-8 text-muted">Sem jogos finalizados ainda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((match) => (
            <a
              key={match.id}
              href={highlightsUrl(match)}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-primary/40"
            >
              <p className="mb-3 text-[11px] font-medium tracking-wide text-muted uppercase">
                {match.competition}
              </p>
              <div className="flex items-center justify-center gap-3">
                {match.homeLogo && (
                  <Image
                    src={match.homeLogo}
                    alt={match.homeTeam}
                    width={36}
                    height={36}
                    className="size-9 object-contain"
                  />
                )}
                <p className="font-display text-xl font-bold tabular-nums">
                  <span className="text-primary">{match.homeScore}</span>
                  <span className="mx-2 text-muted">×</span>
                  <span className="text-primary">{match.awayScore}</span>
                </p>
                {match.awayLogo && (
                  <Image
                    src={match.awayLogo}
                    alt={match.awayTeam}
                    width={36}
                    height={36}
                    className="size-9 object-contain"
                  />
                )}
              </div>
              <p className="mt-2 text-center text-sm font-medium">
                {match.homeTeam} × {match.awayTeam}
              </p>
              <p className="mt-3 border-t border-line pt-2 text-center text-xs text-muted">
                {formatKickoff(match.kickoffAt)}
                {match.stadium ? ` · ${match.stadium}` : ""}
              </p>
              <p className="mt-2 text-center text-xs font-medium text-link group-hover:underline">
                ▶ Ver melhores momentos
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
