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
          <Image
            src={logo}
            alt=""
            width={22}
            height={22}
            className="size-[18px] shrink-0 object-contain sm:size-[22px]"
          />
        ) : (
          <span
            className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-surface-2 text-[8px] font-bold text-muted sm:size-[22px] sm:text-[9px]"
            aria-hidden
          >
            {name.slice(0, 3).toUpperCase()}
          </span>
        )}
        <span
          className={`truncate text-xs sm:text-sm ${isFortaleza ? "font-bold" : "font-medium text-muted"}`}
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

function MatchCard({ match, ocultoNoCelular = false }: { match: Match; ocultoNoCelular?: boolean }) {
  const finished = match.status === "finished";
  const live = match.status === "live";
  const showScore = finished || live;
  return (
    <div
      className={`min-w-0 rounded-[--radius-card] border bg-surface p-3 sm:w-64 sm:shrink-0 sm:snap-start sm:p-4 ${
        live ? "ao-vivo border-primary" : "border-line"
      } ${ocultoNoCelular ? "hidden sm:block" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-medium tracking-wide text-muted uppercase sm:text-[11px]">
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
        {/* Celular: dois cartões lado a lado, largura total. Rolagem horizontal
            com cartão de 256px deixava o segundo cortado pela metade, que era o
            que parecia quebrado. Do `sm` para cima volta a ser trilho. */}
        <div className="scrollbar-none grid grid-cols-2 gap-3 sm:flex sm:snap-x sm:snap-mandatory sm:overflow-x-auto">
          {matches.map((match, i) => (
            <MatchCard key={match.id} match={match} ocultoNoCelular={i >= 2} />
          ))}
        </div>
      </div>
    </section>
  );
}
