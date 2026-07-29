import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { MockMatch } from "@/lib/mock-data";

function TeamBadge({ name }: { name: string }) {
  const initials = name.slice(0, 3).toUpperCase();
  const isFortaleza = name === "Fortaleza";
  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex size-7 items-center justify-center rounded-full text-[10px] font-bold ${
          isFortaleza ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted"
        }`}
        aria-hidden
      >
        {initials}
      </span>
      <span className={`text-sm ${isFortaleza ? "font-bold" : "font-medium text-muted"}`}>
        {name}
      </span>
    </span>
  );
}

function MatchCard({ match }: { match: MockMatch }) {
  const finished = match.status === "finished";
  return (
    <div className="w-64 shrink-0 snap-start rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted">
          {match.competition}
          {match.round ? ` · ${match.round}` : ""}
        </span>
        {match.status === "live" && <Badge variant="live">AO VIVO</Badge>}
        {finished && <Badge variant="neutral">Encerrado</Badge>}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <TeamBadge name={match.homeTeam} />
          {finished && <span className="font-display text-lg font-bold">{match.homeScore}</span>}
        </div>
        <div className="flex items-center justify-between">
          <TeamBadge name={match.awayTeam} />
          {finished && <span className="font-display text-lg font-bold">{match.awayScore}</span>}
        </div>
      </div>
      <p className="mt-3 border-t border-line pt-2 text-xs text-muted">
        {match.kickoffLabel} · {match.stadium}
      </p>
    </div>
  );
}

export function MatchTicker({ matches }: { matches: MockMatch[] }) {
  return (
    <section aria-label="Jogos do Fortaleza" className="border-b border-line bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
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
