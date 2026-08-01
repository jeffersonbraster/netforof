import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { SectionTitle } from "@/components/ui/section-title";
import { getChants } from "@/modules/chants/queries";

export const metadata: Metadata = {
  alternates: { canonical: "/cantos-da-torcida" },
  title: "Cantos da Torcida",
  description:
    "Hinos e cantos da torcida do Fortaleza Esporte Clube: assista ao vídeo e acompanhe a letra.",
};

export default async function CantosPage() {
  const cantos = await getChants();
  const hinos = cantos.filter((c) => c.category === "hino");
  const demais = cantos.filter((c) => c.category !== "hino");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SectionTitle>Cantos da Torcida</SectionTitle>
      <p className="mb-8 max-w-2xl text-muted">
        Abra qualquer faixa para assistir ao vídeo com a letra acompanhando.
      </p>

      {hinos.length > 0 && (
        <section aria-label="Hinos" className="mb-10">
          <h2 className="font-display mb-4 text-lg font-bold tracking-wide uppercase">Hino</h2>
          <Grade itens={hinos} destaque />
        </section>
      )}

      <section aria-label="Cantos">
        <h2 className="font-display mb-4 text-lg font-bold tracking-wide uppercase">
          Cantos da arquibancada
        </h2>
        <Grade itens={demais} />
      </section>
    </div>
  );
}

function Grade({
  itens,
  destaque = false,
}: {
  itens: Awaited<ReturnType<typeof getChants>>;
  destaque?: boolean;
}) {
  if (itens.length === 0) {
    return <p className="text-sm text-muted">Nada por aqui ainda.</p>;
  }

  return (
    <ul
      className={`grid gap-4 ${
        destaque ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
      }`}
    >
      {itens.map((canto) => (
        <li key={canto.id}>
          <Link
            href={`/cantos-da-torcida/${canto.slug}`}
            className="group block overflow-hidden rounded-[--radius-card] border border-line bg-surface transition-colors hover:border-primary"
          >
            <div className="relative aspect-video overflow-hidden">
              <RemoteImage
                src={canto.imageUrl}
                sizes="(max-width: 640px) 100vw, 360px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              {/* Selo de play: diz que abre vídeo antes do clique. */}
              <span
                className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/40"
                aria-hidden
              >
                <span className="flex size-14 items-center justify-center rounded-full bg-primary/95 text-white shadow-lg">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 size-6">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <h3 className="font-display text-lg leading-tight font-extrabold tracking-tight group-hover:text-primary-text">
                {canto.title}
              </h3>
              <Badge variant={canto.category === "hino" ? "live" : "neutral"}>
                {canto.category === "hino" ? "Hino" : "Canto"}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
