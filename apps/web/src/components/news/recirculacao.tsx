import Link from "next/link";

import { RemoteImage } from "@/components/ui/remote-image";
import type { ArticleCard } from "@/modules/news/types";

/**
 * Recirculação no fim da matéria.
 *
 * O fim do texto é onde o leitor decide sair ou continuar. Um bloco genérico de
 * "relacionadas" é ignorado; o que funciona é convite direto e cartão grande o
 * bastante para competir com o botão de voltar.
 */
export function Recirculacao({ itens }: { itens: ArticleCard[] }) {
  if (itens.length === 0) return null;

  const [destaque, ...resto] = itens;

  return (
    <section aria-label="Continue lendo" className="mt-12 border-t-[3px] border-primary pt-6">
      <h2 className="font-display mb-5 text-2xl leading-none font-extrabold tracking-tight uppercase">
        Você também vai gostar
      </h2>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {destaque && (
          <Link href={`/noticias/${destaque.slug}`} className="group block">
            <div className="relative aspect-video overflow-hidden rounded-[--radius-card] border border-line">
              <RemoteImage
                src={destaque.imageUrl}
                sizes="(max-width: 640px) 100vw, 420px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </div>
            <h3 className="font-display mt-3 text-xl leading-tight font-extrabold tracking-tight group-hover:text-primary-text">
              {destaque.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{destaque.excerpt}</p>
          </Link>
        )}

        {resto.length > 0 && (
          <ul className="divide-y divide-line border-t border-line sm:border-t-0">
            {resto.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/noticias/${item.slug}`}
                  className="group flex gap-3 py-3 first:sm:pt-0"
                >
                  <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-[--radius-card] border border-line">
                    <RemoteImage
                      src={item.imageUrl}
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <h3 className="font-display line-clamp-3 min-w-0 text-sm leading-snug font-bold group-hover:text-primary-text">
                    {item.title}
                  </h3>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
