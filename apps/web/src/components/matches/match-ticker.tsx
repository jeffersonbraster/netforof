import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatKickoff } from "@/lib/format";
import type { Match } from "@netfor/db";

function TeamBadge({
  name,
  logo,
  score,
}: {
  name: string;
  logo: string | null;
  score?: number | null;
}) {
  const isFortaleza = name.toLowerCase().includes("fortaleza");
  return (
    <span className="flex min-w-0 items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2">
        {logo ? (
          <Image src={logo} alt="" width={22} height={22} className="size-[22px] object-contain" />
        ) : (
          <span
            className="flex size-[22px] items-center justify-center rounded-full bg-surface-2 text-[9px] font-bold text-muted"
            aria-hidden
          >
            {name.slice(0, 3).toUpperCase()}
          </span>
        )}
        <span
          className={`truncate text-sm ${isFortaleza ? "font-bold" : "font-medium text-muted"}`}
        >
          {name}
        </span>
      </span>
      {score !== undefined && score !== null && (
        <span className="font-display text-base font-bold tabular-nums">{score}</span>
      )}
    </span>
  );
}

function MatchCard({ match }: { match: Match }) {
  const finished = match.status === "finished";
  const live = match.status === "live";
  const showScore = finished || live;
  return (
    <div className="w-64 shrink-0 snap-start rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium tracking-wide text-muted uppercase">
          {match.competition}
          {match.round ? ` · ${match.round}` : ""}
        </span>
        {live && <Badge variant="live">AO VIVO</Badge>}
        {finished && <Badge variant="neutral">Encerrado</Badge>}
      </div>
      <div className="space-y-2">
        <TeamBadge
          name={match.homeTeam}
          logo={match.homeLogo}
          score={showScore ? match.homeScore : undefined}
        />
        <TeamBadge
          name={match.awayTeam}
          logo={match.awayLogo}
          score={showScore ? match.awayScore : undefined}
        />
      </div>
      <p className="mt-3 truncate border-t border-line pt-2 text-xs text-muted">
        {formatKickoff(match.kickoffAt)}
        {match.stadium ? ` · ${match.stadium}` : ""}
      </p>
    </div>
  );
}

export function MatchTicker({ matches }: { matches: Match[] }) {
  if (matches.length === 0) return null;
  return (
    <section aria-label="Jogos do Fortaleza" className="border-b border-line bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">
            Jogos do Leão
          </p>
          <Link
            href="/agenda"
            className="text-xs font-medium text-link hover:underline underline-offset-4"
          >
            Agenda completa →
          </Link>
        </div>
        <div className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    </section>
  );
}
