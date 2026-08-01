import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "@/components/ui/section-title";
import { getChantBySlug, getChants } from "@/modules/chants/queries";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const chants = await getChants();
  return chants.map((chant) => ({ slug: chant.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const chant = await getChantBySlug(slug);
  if (!chant) return { title: "Canto não encontrado" };
  return {
    alternates: { canonical: `/cantos-da-torcida/${slug}` },
    title: `${chant.title} — Letra e vídeo`,
    description: `Assista e acompanhe a letra de "${chant.title}", ${
      chant.category === "hino" ? "hino" : "canto da torcida"
    } do Fortaleza Esporte Clube.`,
  };
}

export default async function ChantPage({ params }: { params: Params }) {
  const { slug } = await params;
  const chant = await getChantBySlug(slug);
  if (!chant) notFound();

  const outros = (await getChants()).filter((c) => c.slug !== slug).slice(0, 6);
  const versos = chant.lyrics
    .split("\n")
    .map((v) => v.trim())
    .filter((v, i, todos) => v !== "" || todos[i - 1] !== "");
  const temLetra = versos.some((v) => v !== "");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/cantos-da-torcida" className="text-sm text-link hover:underline">
        ← Todos os cantos
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl leading-none font-extrabold tracking-tight uppercase sm:text-5xl">
          {chant.title}
        </h1>
        <Badge variant={chant.category === "hino" ? "live" : "neutral"}>
          {chant.category === "hino" ? "Hino" : "Canto"}
        </Badge>
      </div>

      {/* Vídeo e letra lado a lado no desktop: dá para cantar acompanhando sem
          rolar a página. No celular empilha, com o vídeo primeiro. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {chant.videoId ? (
          <div className="relative aspect-video overflow-hidden rounded-[--radius-card] border border-line bg-black">
            <iframe
              // `loading="lazy"` e sem autoplay: o player é pesado e som
              // automático é hostil.
              src={`https://www.youtube-nocookie.com/embed/${chant.videoId}?rel=0`}
              title={`Vídeo — ${chant.title}`}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
          </div>
        ) : (
          <p className="rounded-[--radius-card] border border-line bg-surface p-6 text-sm text-muted">
            Esta faixa ainda não tem vídeo. A letra segue ao lado.
          </p>
        )}

        <div className="rounded-[--radius-card] border border-line bg-surface p-5">
          <h2 className="font-display mb-3 text-sm font-bold tracking-widest text-muted uppercase">
            Letra
          </h2>
          {temLetra ? (
            <div className="space-y-1 text-lg leading-relaxed">
              {versos.map((verso, i) =>
                verso === "" ? (
                  <div key={i} className="h-3" aria-hidden />
                ) : (
                  <p key={i}>{verso}</p>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted">
              A letra desta faixa ainda não foi publicada. Assista ao vídeo ao lado — e se
              quiser contribuir com a letra, escreva para{" "}
              <a
                href="mailto:contato@netfor.com.br"
                className="text-link underline underline-offset-4"
              >
                contato@netfor.com.br
              </a>
              .
            </p>
          )}
        </div>
      </div>

      {outros.length > 0 && (
        <section aria-label="Outros cantos" className="mt-12">
          <SectionTitle href="/cantos-da-torcida" linkLabel="Ver todos">
            Cante também
          </SectionTitle>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {outros.map((outro) => (
              <li key={outro.id}>
                <Link
                  href={`/cantos-da-torcida/${outro.slug}`}
                  className="font-display block rounded-[--radius-card] border border-line bg-surface px-4 py-3 font-bold transition-colors hover:border-primary hover:text-primary-text"
                >
                  {outro.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
