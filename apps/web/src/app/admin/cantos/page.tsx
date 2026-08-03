import { asc, chants } from "@netfor/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";
import { db } from "@/lib/db";

import { Aviso, BotaoLink, Cartao, Selo, TituloDaTela, Vazio } from "../ui";

type Busca = Promise<{ removido?: string }>;

export default function CantosPage({ searchParams }: { searchParams: Busca }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

async function Lista({ searchParams }: { searchParams: Busca }) {
  if (!(await sessaoValida())) redirect("/admin/login");
  const { removido } = await searchParams;

  // Sem cache, como todo o painel: `getChants()` vive em `cacheLife("days")` e
  // mostraria a lista de ontem logo depois de uma edição.
  const lista = await db
    .select()
    .from(chants)
    .orderBy(asc(chants.order), asc(chants.title));

  return (
    <>
      <TituloDaTela
        descricao="Letras, vídeo e ordem de exibição da seção Cantos da Torcida."
        acoes={
          <BotaoLink href="/admin/cantos/novo" variante="primario">
            + Novo canto
          </BotaoLink>
        }
      >
        Cantos
      </TituloDaTela>

      {removido && <Aviso>Canto removido.</Aviso>}

      {lista.length === 0 ? (
        <Vazio>Nenhum canto cadastrado. Comece pelo hino.</Vazio>
      ) : (
        <ul className="space-y-2">
          {lista.map((canto) => (
            <li key={canto.id}>
              <Cartao className="flex items-center gap-3 p-3 transition-colors hover:border-primary/40">
                <span className="font-display w-8 shrink-0 text-sm text-muted tabular-nums">
                  {canto.order}
                </span>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/cantos/${canto.id}`}
                    className="font-display block truncate font-bold hover:text-primary-text"
                  >
                    {canto.title}
                  </Link>
                  {/*
                    O que dá para conferir sem abrir: se tem player e o tamanho
                    da letra. Letra de 1 linha quase sempre é cadastro pela
                    metade.
                  */}
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="truncate">/{canto.slug}</span>
                    <span aria-hidden>·</span>
                    <span className="whitespace-nowrap">
                      {canto.lyrics.split("\n").filter(Boolean).length} versos
                    </span>
                    {!canto.videoId && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="whitespace-nowrap text-primary-text">sem vídeo</span>
                      </>
                    )}
                  </p>
                </div>

                <Selo tom={canto.category === "hino" ? "ativo" : "neutro"}>
                  {canto.category === "hino" ? "Hino" : "Canto"}
                </Selo>
              </Cartao>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-muted">
        A ordem é o número à esquerda — menor aparece antes na página pública.
      </p>
    </>
  );
}
