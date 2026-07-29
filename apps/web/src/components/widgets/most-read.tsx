import Link from "next/link";

import { SectionTitle } from "@/components/ui/section-title";
import { mockMostRead } from "@/lib/mock-data";

export function MostRead() {
  return (
    <section aria-label="Mais lidas da semana">
      <SectionTitle>Mais lidas da semana</SectionTitle>
      <ol className="space-y-3">
        {mockMostRead.map((item, index) => (
          <li key={item.slug}>
            <Link href={`/noticias/${item.slug}`} className="group flex gap-3">
              <span
                className="font-display text-2xl font-black leading-none text-primary/60"
                aria-hidden
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
                  {item.title}
                </span>
                <span className="text-xs text-muted">{item.views} leituras</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
