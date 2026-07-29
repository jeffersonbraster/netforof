import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "@/components/ui/section-title";

export interface ChantSummary {
  title: string;
  slug: string;
  category: "hino" | "canto";
  firstLine: string;
}

export function ChantsWidget({ chants }: { chants: ChantSummary[] }) {
  if (chants.length === 0) return null;
  return (
    <section aria-label="Cantos da torcida">
      <SectionTitle href="/cantos-da-torcida" linkLabel="Todos os cantos">
        Cantos da Torcida
      </SectionTitle>
      <ul className="space-y-2">
        {chants.map((chant) => (
          <li key={chant.slug}>
            <Link
              href={`/cantos-da-torcida/${chant.slug}`}
              className="group block rounded-xl border border-line bg-surface p-3 transition-colors hover:border-primary/40"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-semibold group-hover:text-primary">
                  {chant.title}
                </h3>
                <Badge variant={chant.category === "hino" ? "category" : "neutral"}>
                  {chant.category}
                </Badge>
              </div>
              <p className="truncate text-xs italic text-muted">{chant.firstLine}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
