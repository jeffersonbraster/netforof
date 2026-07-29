import { cacheLife, cacheTag } from "next/cache";

import { MatchTicker } from "@/components/matches/match-ticker";
import { CompactCard, HeroCard, NewsCard } from "@/components/news/news-card";
import { ButtonLink } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { AdSlot } from "@/components/widgets/ad-slot";
import { ChantsWidget } from "@/components/widgets/chants-widget";
import { MiniStandings } from "@/components/widgets/mini-standings";
import { MostRead } from "@/components/widgets/most-read";
import { mockMatches, mockStandings } from "@/lib/mock-data";
import { getChants } from "@/modules/chants/queries";
import { getHomeArticles, getMostReadWeek } from "@/modules/news/queries";

export default async function Home() {
  "use cache";
  cacheTag("articles", "chants");
  cacheLife("hours");

  const [{ hero, secondary, latest }, mostRead, chants] = await Promise.all([
    getHomeArticles(),
    getMostReadWeek(),
    getChants(),
  ]);

  const finishedMatches = mockMatches.filter((m) => m.status === "finished");
  const chantSummaries = chants.slice(0, 3).map((chant) => ({
    title: chant.title,
    slug: chant.slug,
    category: chant.category,
    firstLine: `${chant.lyrics.split("\n")[0] ?? ""}…`,
  }));

  return (
    <>
      <MatchTicker matches={mockMatches} />

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        {hero && (
          <section aria-label="Destaques">
            <SectionTitle>Destaques</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <HeroCard article={hero} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {secondary.map((article) => (
                  <CompactCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          </section>
        )}

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
            <MiniStandings standings={mockStandings} />
            <ChantsWidget chants={chantSummaries} />
            <AdSlot format="rectangle" label="Patrocínio" />
          </aside>
        </div>

        <section aria-label="Últimos jogos">
          <SectionTitle href="/videos" linkLabel="Ver vídeos">
            Últimos Jogos
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {finishedMatches.map((match) => (
              <div key={match.id} className="rounded-xl border border-line bg-surface p-5">
                <p className="mb-3 text-[11px] font-medium tracking-wide text-muted uppercase">
                  {match.competition}
                  {match.round ? ` · ${match.round}` : ""}
                </p>
                <p className="font-display text-lg font-bold">
                  {match.homeTeam} <span className="text-primary">{match.homeScore}</span> ×{" "}
                  <span className="text-primary">{match.awayScore}</span> {match.awayTeam}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {match.kickoffLabel} · {match.stadium}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
