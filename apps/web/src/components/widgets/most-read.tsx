import Link from "next/link";

import { SectionTitle } from "@/components/ui/section-title";
import type { MostReadItem } from "@/modules/news/queries";

export function MostRead({ items }: { items: MostReadItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Mais lidas da semana">
      <SectionTitle>Mais lidas da semana</SectionTitle>
      <ol className="space-y-3">
        {items.map((item, index) => (
          <li key={item.slug}>
            <Link href={`/noticias/${item.slug}`} className="group flex gap-3">
              <span
                className="font-display text-2xl leading-none font-black text-primary/60"
                aria-hidden
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 text-sm leading-snug font-semibold group-hover:text-primary">
                  {item.title}
                </span>
                {item.views > 0 && (
                  <span className="text-xs text-muted">{item.views} leituras</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
