import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
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
    title: `${chant.title} — Letra`,
    description: `Letra de "${chant.title}" — ${chant.category === "hino" ? "hino" : "canto da torcida"} do Fortaleza Esporte Clube.`,
  };
}

export default async function ChantPage({ params }: { params: Params }) {
  const { slug } = await params;
  const chant = await getChantBySlug(slug);
  if (!chant) notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-3">
        <Badge variant={chant.category === "hino" ? "category" : "neutral"}>{chant.category}</Badge>
      </div>
      <h1 className="font-display text-2xl leading-tight font-extrabold sm:text-3xl">
        {chant.title}
      </h1>

      <div className="mt-6 rounded-xl border border-line bg-surface p-6">
        <p className="text-lg leading-loose whitespace-pre-line">{chant.lyrics}</p>
      </div>

      {chant.audioUrl && (
        <audio controls src={chant.audioUrl} className="mt-6 w-full">
          Seu navegador não suporta áudio.
        </audio>
      )}

      <p className="mt-8">
        <Link
          href="/cantos-da-torcida"
          className="text-sm text-link hover:underline underline-offset-4"
        >
          ← Todos os cantos
        </Link>
      </p>
    </article>
  );
}
