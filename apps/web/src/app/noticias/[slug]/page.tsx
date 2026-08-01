import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CompactCard } from "@/components/news/news-card";
import { Recirculacao } from "@/components/news/recirculacao";
import { ViewTracker } from "@/components/news/view-tracker";
import { Badge } from "@/components/ui/badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { SectionTitle } from "@/components/ui/section-title";
import { AdSlot } from "@/components/widgets/ad-slot";
import { formatLongDate, formatShortDateTime } from "@/lib/format";
import { FALLBACK_IMAGE } from "@/lib/images";
import { breadcrumbJsonLd, JsonLd, SITE_URL } from "@/lib/seo";
import {
  getArticleBySlug,
  getArticleDetail,
  getPublishedSlugs,
  getRecirculacao,
} from "@/modules/news/queries";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const { getArticlesPage } = await import("@/modules/news/queries");
  const { items } = await getArticlesPage({ page: 1, category: null, sourceSlug: null });
  return items.map((article) => ({ slug: article.slug }));
}

// Sem "use cache" próprio: os dados já vêm de funções cacheadas. Um escopo
// cacheado aqui só criaria mais uma entrada no KV por slug, sem poupar consulta.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Notícia não encontrada" };
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/noticias/${slug}` },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  // Valida ANTES de entrar em escopo cacheado. Com "use cache" + PPR o shell já
  // sai com HTTP 200 e o notFound() só acontece durante o streaming: o resultado
  // era um soft 404 (200 com corpo de "não encontrada"). Aqui o 404 é de
  // verdade, e o slug inválido nunca chega a virar chave de cache.
  const publicados = await getPublishedSlugs();
  if (!publicados.includes(slug)) notFound();

  return <ArticleBody slug={slug} />;
}

// Tag só do próprio slug: notícia nova não precisa invalidar página de matéria
// antiga. E chama getArticleDetail direto porque o slug já foi validado acima —
// passar pelo porteiro traria a tag `articles` junto e anularia o ganho.
async function ArticleBody({ slug }: { slug: string }) {
  "use cache";
  cacheTag(`article-${slug}`);
  cacheLife("days");
  const article = await getArticleDetail(slug);
  if (!article) notFound();

  const recirculacao = await getRecirculacao(slug, article.category);

  const paragrafos = (article.content ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    image: [article.imageUrl ?? `${SITE_URL}${FALLBACK_IMAGE}`],
    datePublished: article.publishedAt.toISOString(),
    inLanguage: "pt-BR",
    url: `${SITE_URL}/noticias/${article.slug}`,
    author: { "@type": "Organization", name: "NETFOR", url: SITE_URL },
    dateModified: article.publishedAt.toISOString(),
    publisher: {
      "@type": "Organization",
      name: "NETFOR",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/netfor.svg` },
    },
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

      {paragrafos.length > 0 && (
        <div className="mt-6 space-y-4 text-base leading-relaxed">
          {paragrafos.map((paragrafo, i) => (
            <p key={i}>{paragrafo}</p>
          ))}
        </div>
      )}

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

      <Recirculacao itens={recirculacao} />

      <p className="mt-10">
        <Link href="/noticias" className="text-sm text-link hover:underline underline-offset-4">
          ← Voltar para as notícias
        </Link>
      </p>
    </article>
  );
}
