import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "@/components/ui/section-title";
import { formatKickoff } from "@/lib/format";
import { JsonLd } from "@/lib/seo";
import { getAgenda } from "@/modules/matches/queries";
import type { Match } from "@netfor/db";

export const metadata: Metadata = {
  alternates: { canonical: "/agenda" },
  title: "Agenda de Jogos do Fortaleza",
  description:
    "Próximos jogos e resultados do Fortaleza Esporte Clube: datas, horários, estádios e placares atualizados.",
};

function TeamRow({
  name,
  logo,
  score,
}: {
  name: string;
  logo: string | null;
  score: number | null;
}) {
  const isFortaleza = name.toLowerCase().includes("fortaleza");
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2.5">
        {logo ? (
          <Image src={logo} alt="" width={26} height={26} className="size-[26px] object-contain" />
        ) : (
          <span className="size-[26px] rounded-full bg-surface-2" aria-hidden />
        )}
        <span className={`truncate ${isFortaleza ? "font-bold" : "text-muted"}`}>{name}</span>
      </span>
      {score !== null && (
        <span className="font-display text-lg font-bold tabular-nums">{score}</span>
      )}
    </div>
  );
}

function MatchRow({ match }: { match: Match }) {
  const showScore = match.status !== "scheduled";
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium tracking-wide text-muted uppercase">
          {match.competition}
        </span>
        {match.status === "live" && <Badge variant="live">AO VIVO</Badge>}
      </div>
      <div className="space-y-2">
        <TeamRow
          name={match.homeTeam}
          logo={match.homeLogo}
          score={showScore ? match.homeScore : null}
        />
        <TeamRow
          name={match.awayTeam}
          logo={match.awayLogo}
          score={showScore ? match.awayScore : null}
        />
      </div>
      <p className="mt-3 truncate border-t border-line pt-2 text-xs text-muted">
        {formatKickoff(match.kickoffAt)}
        {match.stadium ? ` · ${match.stadium}` : ""}
      </p>
    </div>
  );
}

export default async function AgendaPage() {
  "use cache";
  cacheTag("matches");
  cacheLife("hours");

  const { upcoming, results } = await getAgenda();

  const sportsEventsJsonLd = {
    "@context": "https://schema.org",
    "@graph": upcoming.slice(0, 10).map((match) => ({
      "@type": "SportsEvent",
      name: `${match.homeTeam} x ${match.awayTeam} — ${match.competition}`,
      startDate: match.kickoffAt.toISOString(),
      sport: "Soccer",
      eventStatus: "https://schema.org/EventScheduled",
      location: match.stadium ? { "@type": "Place", name: match.stadium } : undefined,
      homeTeam: { "@type": "SportsTeam", name: match.homeTeam },
      awayTeam: { "@type": "SportsTeam", name: match.awayTeam },
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <JsonLd data={sportsEventsJsonLd} />
      <section aria-label="Próximos jogos">
        <SectionTitle>Próximos Jogos</SectionTitle>
        {upcoming.length === 0 ? (
          <p className="py-8 text-muted">Nenhum jogo agendado no momento.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Resultados" className="mt-12">
        <SectionTitle>Últimos Resultados</SectionTitle>
        {results.length === 0 ? (
          <p className="py-8 text-muted">Sem resultados recentes.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
