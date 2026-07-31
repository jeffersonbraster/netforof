import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CompactCard } from "@/components/news/news-card";
import { ViewTracker } from "@/components/news/view-tracker";
import { Badge } from "@/components/ui/badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { SectionTitle } from "@/components/ui/section-title";
import { AdSlot } from "@/components/widgets/ad-slot";
import { formatLongDate, formatShortDateTime } from "@/lib/format";
import { FALLBACK_IMAGE } from "@/lib/images";
import { breadcrumbJsonLd, JsonLd, SITE_URL } from "@/lib/seo";
import { getArticleBySlug } from "@/modules/news/queries";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const { getArticlesPage } = await import("@/modules/news/queries");
  const { items } = await getArticlesPage({ page: 1, category: null, sourceSlug: null });
  return items.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  "use cache";
  cacheTag("articles");
  cacheLife("hours");
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Notícia não encontrada" };
  return {
    title: article.title,
    description: article.excerpt,
    // Modo A: a matéria completa vive na fonte — evita punição por conteúdo duplicado
    robots: { index: false, follow: true },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  "use cache";
  cacheTag("articles");
  cacheLife("hours");
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    image: [article.imageUrl ?? `${SITE_URL}${FALLBACK_IMAGE}`],
    datePublished: article.publishedAt.toISOString(),
    inLanguage: "pt-BR",
    url: `${SITE_URL}/noticias/${article.slug}`,
    isBasedOn: article.originalUrl,
    author: { "@type": "Organization", name: article.sourceName },
    publisher: { "@type": "Organization", name: "NETFOR", url: SITE_URL },
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <ViewTracker slug={article.slug} />
      <JsonLd data={newsArticleJsonLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Início", url: "/" },
          { name: "Notícias", url: "/noticias" },
          { name: article.title, url: `/noticias/${article.slug}` },
        ])}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {article.category && <Badge variant="category">{article.category}</Badge>}
        <Badge variant="source">{article.sourceName}</Badge>
      </div>

      <h1 className="font-display text-2xl leading-tight font-extrabold sm:text-3xl">
        {article.title}
      </h1>

      <p className="mt-3 text-sm text-muted">
        Publicada em {formatLongDate(article.publishedAt)} ·{" "}
        {formatShortDateTime(article.publishedAt)}
      </p>

      <div className="relative mt-6 aspect-video overflow-hidden rounded-xl border border-line">
        <RemoteImage
          src={article.imageUrl}
          priority
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover"
        />
      </div>

      <p className="mt-6 text-lg leading-relaxed">{article.excerpt}</p>

      {/* Modo A: crédito visível + CTA para a fonte original */}
      <div className="mt-8 rounded-xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">
          Esta é uma prévia. A matéria completa foi publicada por{" "}
          <strong className="text-foreground">{article.sourceName}</strong>.
        </p>
        <a
          href={article.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/85"
        >
          Ler matéria completa na fonte →
        </a>
      </div>

      <div className="mt-8">
        <AdSlot format="leaderboard" />
      </div>

      {article.related.length > 0 && (
        <section aria-label="Cobertura relacionada" className="mt-10">
          <SectionTitle>Cobertura relacionada</SectionTitle>
          <div className="space-y-4">
            {article.related.map((related) => (
              <CompactCard key={related.id} article={related} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-10">
        <Link href="/noticias" className="text-sm text-link hover:underline underline-offset-4">
          ← Voltar para as notícias
        </Link>
      </p>
    </article>
  );
}
