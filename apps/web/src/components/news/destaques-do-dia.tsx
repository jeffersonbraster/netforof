import Link from "next/link";

import { RemoteImage } from "@/components/ui/remote-image";
import { formatShortDateTime } from "@/lib/format";
import type { ArticleCard } from "@/modules/news/types";

/**
 * Destaques do dia — faixa horizontal com o que move o portal nas últimas 24h.
 *
 * Textura própria de propósito: é uma faixa com fundo azul do clube e cartões
 * largos e baixos, não mais um grid de cards iguais aos de baixo. A home é uma
 * sequência de superfícies de descoberta; se todas usarem o mesmo cartão, viram
 * uma lista só, comprida.
 */
export function DestaquesDoDia({ itens }: { itens: ArticleCard[] }) {
  if (itens.length === 0) return null;

  return (
    <section aria-label="Destaques do dia" className="bg-secondary text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="font-display mb-5 flex items-baseline gap-3 text-2xl leading-none font-extrabold tracking-tight uppercase sm:text-[28px]">
          <span className="bg-primary px-2 py-0.5">Destaques</span>
          <span>do dia</span>
        </h2>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {itens.map((item) => (
            <li key={item.id}>
              <Link href={`/noticias/${item.slug}`} className="group flex gap-3 sm:block">
                <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-[--radius-card] sm:w-full">
                  <RemoteImage
                    src={item.imageUrl}
                    sizes="(max-width: 640px) 112px, 280px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="min-w-0 sm:mt-2">
                  <h3 className="font-display line-clamp-3 text-base leading-snug font-bold group-hover:underline underline-offset-4 sm:text-lg">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-white/70">
                    {formatShortDateTime(item.publishedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
