import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { NewsCard } from "@/components/news/news-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { Skeleton } from "@/components/ui/skeleton";
import { getArticlesPage, getNewsFilters } from "@/modules/news/queries";

export const metadata: Metadata = {
  title: "Notícias do Fortaleza",
  description:
    "Todas as notícias do Fortaleza Esporte Clube agregadas dos principais portais, atualizadas 24/7.",
};

function buildQuery(params: Record<string, string | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const s = query.toString();
  return s ? `?${s}` : "";
}

type SearchParams = Promise<{ pagina?: string; categoria?: string; fonte?: string }>;

async function NewsList({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);
  const category = params.categoria ?? null;
  const sourceSlug = params.fonte ?? null;

  const [{ items, total, pageSize }, filters] = await Promise.all([
    getArticlesPage({ page, category, sourceSlug }),
    getNewsFilters(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      {/* Filtros por categoria e fonte (diferencial 4 do plano) */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">
            Categoria:
          </span>
          <Link href={`/noticias${buildQuery({ fonte: sourceSlug })}`}>
            <Badge variant={category === null ? "live" : "neutral"}>Todas</Badge>
          </Link>
          {filters.categories.map((c) => (
            <Link key={c} href={`/noticias${buildQuery({ categoria: c, fonte: sourceSlug })}`}>
              <Badge variant={category === c ? "live" : "neutral"}>{c}</Badge>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">Fonte:</span>
          <Link href={`/noticias${buildQuery({ categoria: category })}`}>
            <Badge variant={sourceSlug === null ? "live" : "neutral"}>Todas</Badge>
          </Link>
          {filters.sources.map((s) => (
            <Link
              key={s.slug}
              href={`/noticias${buildQuery({ categoria: category, fonte: s.slug })}`}
            >
              <Badge variant={sourceSlug === s.slug ? "live" : "neutral"}>{s.name}</Badge>
            </Link>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-muted">
          Nenhuma notícia encontrada com esses filtros.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Paginação" className="mt-8 flex items-center justify-center gap-4">
          {page > 1 && (
            <ButtonLink
              variant="outline"
              size="sm"
              href={`/noticias${buildQuery({ categoria: category, fonte: sourceSlug, pagina: String(page - 1) })}`}
            >
              ← Anteriores
            </ButtonLink>
          )}
          <span className="text-sm text-muted">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <ButtonLink
              variant="outline"
              size="sm"
              href={`/noticias${buildQuery({ categoria: category, fonte: sourceSlug, pagina: String(page + 1) })}`}
            >
              Próximas →
            </ButtonLink>
          )}
        </nav>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function NoticiasPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SectionTitle>Notícias</SectionTitle>
      <Suspense fallback={<ListSkeleton />}>
        <NewsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
