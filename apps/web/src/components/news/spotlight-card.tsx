import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { formatShortDateTime } from "@/lib/format";
import type { ArticleCard } from "@/modules/news/types";

/**
 * Card de destaque lateral — imagem grande com o texto por cima.
 *
 * A sobreposição aqui é segura, ao contrário da que existia na manchete, porque
 * o véu é OPACO o suficiente por si só (`from-black/95` até `to-black/25`), não
 * um degradê tênue que dependia da foto ser escura. Como o véu é escuro nos dois
 * temas, o texto branco funciona no claro e no escuro.
 *
 * As duas outras defesas: `line-clamp` no título, para que texto longo não
 * empurre o bloco para fora da imagem, e altura mínima, para que a área escura
 * exista mesmo com foto de proporção estranha.
 */
export function SpotlightCard({ article }: { article: ArticleCard }) {
  return (
    <article className="group relative min-h-56 overflow-hidden rounded-[--radius-card] border border-line">
      <Link href={`/noticias/${article.slug}`} className="block h-full">
        <div className="absolute inset-0">
          <RemoteImage
            src={article.imageUrl}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>

        <div
          className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/25"
          aria-hidden
        />

        <div className="relative flex h-full min-h-56 flex-col justify-end gap-2 p-4">
          {article.category && (
            <div>
              <Badge variant="category">{article.category}</Badge>
            </div>
          )}
          <h3 className="font-display line-clamp-3 text-xl leading-[1.1] font-extrabold tracking-tight text-white group-hover:underline underline-offset-4 sm:text-[1.6rem]">
            {article.title}
          </h3>
          <p className="text-xs text-white/70">{formatShortDateTime(article.publishedAt)}</p>
        </div>
      </Link>
    </article>
  );
}
