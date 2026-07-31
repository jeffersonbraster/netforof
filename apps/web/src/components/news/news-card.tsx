import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { formatShortDateTime } from "@/lib/format";
import type { ArticleCard } from "@/modules/news/types";

function CardImage({
  article,
  sizes,
  priority = false,
}: {
  article: ArticleCard;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <RemoteImage
      src={article.imageUrl}
      sizes={sizes}
      priority={priority}
      quality={priority ? 60 : 75}
      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
}

export function NewsCard({ article }: { article: ArticleCard }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-primary/40">
      <Link href={`/noticias/${article.slug}`} className="block">
        <div className="relative aspect-video overflow-hidden">
          <CardImage article={article} sizes="(max-width: 768px) 100vw, 400px" />
        </div>
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {article.category && <Badge variant="category">{article.category}</Badge>}
            <Badge variant="source">{article.sourceName}</Badge>
          </div>
          <h3 className="font-display text-base leading-snug font-bold group-hover:text-primary-text">
            {article.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted">{article.excerpt}</p>
          <p className="text-xs text-muted">{formatShortDateTime(article.publishedAt)}</p>
        </div>
      </Link>
    </article>
  );
}

export function HeroCard({ article }: { article: ArticleCard }) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-line">
      <Link href={`/noticias/${article.slug}`} className="block">
        <div className="relative aspect-video overflow-hidden sm:aspect-[16/10]">
          <CardImage article={article} sizes="(max-width: 1024px) 100vw, 640px" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {article.category && <Badge variant="category">{article.category}</Badge>}
            <Badge variant="source">{article.sourceName}</Badge>
          </div>
          <h2 className="font-display text-xl leading-tight font-extrabold text-white sm:text-2xl">
            {article.title}
          </h2>
          <p className="line-clamp-2 max-w-xl text-sm text-white/75">{article.excerpt}</p>
        </div>
      </Link>
    </article>
  );
}

export function CompactCard({ article }: { article: ArticleCard }) {
  return (
    <article className="group">
      <Link href={`/noticias/${article.slug}`} className="flex gap-3">
        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg border border-line">
          <CardImage article={article} sizes="112px" />
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold group-hover:text-primary-text">
            {article.title}
          </h3>
          <p className="text-xs text-muted">
            {article.sourceName} · {formatShortDateTime(article.publishedAt)}
          </p>
        </div>
      </Link>
    </article>
  );
}
