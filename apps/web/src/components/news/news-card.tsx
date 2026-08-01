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
    <article className="group flex h-full flex-col overflow-hidden rounded-[--radius-card] border border-line bg-surface transition-colors hover:border-primary">
      <Link href={`/noticias/${article.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-video overflow-hidden">
          <CardImage article={article} sizes="(max-width: 768px) 100vw, 400px" />
        </div>
        <div className="flex flex-1 flex-col space-y-2 p-4">
          {article.category && (
            <div>
              <Badge variant="category">{article.category}</Badge>
            </div>
          )}
          <h3 className="font-display text-xl leading-[1.15] font-bold tracking-tight group-hover:text-primary-text">
            {article.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted">{article.excerpt}</p>
          <p className="text-xs text-muted">{formatShortDateTime(article.publishedAt)}</p>
        </div>
      </Link>
    </article>
  );
}

/**
 * Manchete. O texto vive ABAIXO da imagem, não sobreposto a ela.
 *
 * A sobreposição com gradiente é bonita quando a foto é escura e o título é
 * curto — e quebra nos dois casos contrários: no tema claro o texto branco some
 * sobre foto clara, e título longo transborda a área da imagem. Texto embaixo é
 * legível sempre, e é o que capa de jornal faz.
 */
export function HeroCard({ article }: { article: ArticleCard }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[--radius-card] border border-line border-l-[3px] border-l-primary bg-surface">
      <Link href={`/noticias/${article.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-video overflow-hidden">
          <CardImage article={article} sizes="(max-width: 1024px) 100vw, 720px" priority />
        </div>
        <div className="flex flex-col gap-2 p-5">
          {article.category && (
            <div>
              <Badge variant="category">{article.category}</Badge>
            </div>
          )}
          <h2 className="font-display text-3xl leading-[1.05] font-extrabold tracking-tight group-hover:text-primary-text sm:text-[2.75rem]">
            {article.title}
          </h2>
          <p className="line-clamp-3 max-w-2xl leading-relaxed text-muted">{article.excerpt}</p>
          <p className="text-xs text-muted">{formatShortDateTime(article.publishedAt)}</p>
        </div>
      </Link>
    </article>
  );
}

export function CompactCard({ article }: { article: ArticleCard }) {
  return (
    <article className="group">
      <Link href={`/noticias/${article.slug}`} className="flex gap-3">
        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-[--radius-card] border border-line">
          <CardImage article={article} sizes="112px" />
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="font-display line-clamp-2 text-base leading-snug font-bold group-hover:text-primary-text">
            {article.title}
          </h3>
          <p className="text-xs text-muted">{formatShortDateTime(article.publishedAt)}</p>
        </div>
      </Link>
    </article>
  );
}
