import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "@/components/ui/section-title";
import { getChants } from "@/modules/chants/queries";

export const metadata: Metadata = {
  title: "Cantos da Torcida e Hinos",
  description:
    "Letras do hino do Fortaleza Esporte Clube e dos cantos da torcida tricolor para cantar no Castelão.",
};

export default async function CantosPage() {
  const chants = await getChants();
  const hinos = chants.filter((c) => c.category === "hino");
  const cantos = chants.filter((c) => c.category === "canto");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SectionTitle>Cantos da Torcida</SectionTitle>
      <p className="mb-8 text-sm text-muted">
        O hino e os cantos que embalam o Leão do Pici no Castelão. Escolha um para ver a letra
        completa.
      </p>

      {[
        { label: "Hinos", items: hinos },
        { label: "Cantos", items: cantos },
      ]
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <section key={group.label} aria-label={group.label} className="mb-10">
            <h2 className="mb-4 font-display text-sm font-bold tracking-wide uppercase">
              {group.label}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {group.items.map((chant) => (
                <li key={chant.id}>
                  <Link
                    href={`/cantos-da-torcida/${chant.slug}`}
                    className="group block h-full rounded-xl border border-line bg-surface p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="font-display font-bold group-hover:text-primary">
                        {chant.title}
                      </h3>
                      <Badge variant={chant.category === "hino" ? "category" : "neutral"}>
                        {chant.category}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm italic text-muted">
                      {chant.lyrics.split("\n")[0]}…
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
