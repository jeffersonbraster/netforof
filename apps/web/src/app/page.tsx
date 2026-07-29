import { MatchTicker } from "@/components/matches/match-ticker";
import { CompactCard, HeroCard, NewsCard } from "@/components/news/news-card";
import { ButtonLink } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { AdSlot } from "@/components/widgets/ad-slot";
import { ChantsWidget } from "@/components/widgets/chants-widget";
import { MiniStandings } from "@/components/widgets/mini-standings";
import { MostRead } from "@/components/widgets/most-read";
import { mockArticles, mockChants, mockMatches, mockStandings } from "@/lib/mock-data";

export default function Home() {
  const hero = mockArticles.find((a) => a.isHighlighted) ?? mockArticles[0]!;
  const secondary = mockArticles.filter((a) => a.id !== hero.id).slice(0, 4);
  const latest = mockArticles.filter((a) => a.id !== hero.id);
  const finishedMatches = mockMatches.filter((m) => m.status === "finished");

  return (
    <>
      <MatchTicker matches={mockMatches} />

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        {/* Hero: destaque + 4 secundárias */}
        <section aria-label="Destaques">
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle>Destaques</SectionTitle>
            <p className="mb-4 text-xs text-muted">
              <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-emerald-500 align-middle" />
              Atualizado há 12 min
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <HeroCard article={hero} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {secondary.map((article) => (
                <CompactCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>

        <AdSlot format="leaderboard" />

        {/* Últimas + sidebar */}
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
            <MostRead />
            <MiniStandings standings={mockStandings} />
            <ChantsWidget chants={mockChants} />
            <AdSlot format="rectangle" label="Patrocínio" />
          </aside>
        </div>

        {/* Últimos jogos / vídeos */}
        <section aria-label="Últimos jogos">
          <SectionTitle href="/videos" linkLabel="Ver vídeos">
            Últimos Jogos
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {finishedMatches.map((match) => (
              <div key={match.id} className="rounded-xl border border-line bg-surface p-5">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">
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
