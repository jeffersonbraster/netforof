import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { MatchTicker } from "@/components/matches/match-ticker";
import { DestaquesDoDia } from "@/components/news/destaques-do-dia";
import { HeroCard, NewsCard } from "@/components/news/news-card";
import { ButtonLink } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { AdSlot } from "@/components/widgets/ad-slot";
import { formatKickoff } from "@/lib/format";
import { ChantsWidget } from "@/components/widgets/chants-widget";
import { MiniStandings } from "@/components/widgets/mini-standings";
import { MostRead } from "@/components/widgets/most-read";
import { SponsorCard } from "@/components/widgets/sponsor-card";
import { getChants } from "@/modules/chants/queries";
import { getRecentResults, getStandings, getTickerMatches } from "@/modules/matches/queries";
import { getDestaquesDoDia, getHomeArticles, getMostReadWeek } from "@/modules/news/queries";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  "use cache";
  cacheTag("articles", "chants", "matches", "standings");
  cacheLife("hours");

  const [
    { hero, secondary, latest },
    destaquesDoDia,
    mostRead,
    chants,
    tickerMatches,
    standings,
    recentResults,
  ] = await Promise.all([
      getHomeArticles(),
      getDestaquesDoDia(4),
      getMostReadWeek(),
      getChants(),
      getTickerMatches(),
      getStandings(),
      getRecentResults(3),
    ]);

  const miniTable = standings.slice(0, 6);
  const chantSummaries = chants.slice(0, 3).map((chant) => ({
    title: chant.title,
    slug: chant.slug,
    category: chant.category,
    firstLine: `${chant.lyrics.split("\n")[0] ?? ""}…`,
  }));

  return (
    <>
      <MatchTicker matches={tickerMatches} />

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        {/* Superfície 1 — a manchete e duas ao lado. Capa de jornal não anuncia
            "destaques": mostra a manchete e pronto. */}
        {hero && (
          <section aria-label="Manchete">
            <div className="grid items-stretch gap-5 lg:grid-cols-[1.6fr_1fr]">
              <HeroCard article={hero} />
              {secondary.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                  {secondary.map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

      </div>

      <DestaquesDoDia itens={destaquesDoDia} />

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <AdSlot format="leaderboard" />

        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <section aria-label="Últimas notícias">
            <SectionTitle href="/noticias">Últimas Notícias</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {latest.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <ButtonLink href="/noticias" variant="outline">
                Ver todas as notícias
              </ButtonLink>
            </div>
          </section>

          <aside className="space-y-8">
            <MostRead items={mostRead} />
            <MiniStandings standings={miniTable} />
            <ChantsWidget chants={chantSummaries} />
            <SponsorCard />
          </aside>
        </div>

        <section aria-label="Últimos jogos">
          <SectionTitle href="/videos" linkLabel="Ver vídeos">
            Últimos Jogos
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentResults.map((match) => (
              <div key={match.id} className="border-t-[3px] border-secondary bg-surface p-5">
                <p className="mb-3 text-[11px] font-medium tracking-wide text-muted uppercase">
                  {match.competition}
                </p>
                <p className="font-display text-2xl leading-tight font-extrabold tabular-nums">
                  {match.homeTeam} <span className="text-primary-text">{match.homeScore}</span> ×{" "}
                  <span className="text-primary-text">{match.awayScore}</span> {match.awayTeam}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {formatKickoff(match.kickoffAt)}
                  {match.stadium ? ` · ${match.stadium}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
