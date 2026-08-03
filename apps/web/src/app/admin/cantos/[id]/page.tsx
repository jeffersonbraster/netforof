import { chants, eq } from "@netfor/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";
import { db } from "@/lib/db";

import { Aviso, Botao, TituloDaTela } from "../../ui";
import { removerCanto, salvarCanto } from "../actions";
import { FormularioDeCanto } from "../formulario";

type Params = Promise<{ id: string }>;
type Busca = Promise<{ salvo?: string; erro?: string }>;

export default function EditarCantoPage(props: { params: Params; searchParams: Busca }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Tela {...props} />
    </Suspense>
  );
}

async function Tela({ params, searchParams }: { params: Params; searchParams: Busca }) {
  if (!(await sessaoValida())) redirect("/admin/login");

  const { id } = await params;
  const { salvo, erro } = await searchParams;
  const numero = Number.parseInt(id, 10);
  if (!Number.isInteger(numero)) notFound();

  const [canto] = await db.select().from(chants).where(eq(chants.id, numero)).limit(1);
  if (!canto) notFound();

  return (
    <>
      <TituloDaTela
        descricao="A página pública atualiza assim que salvar."
        acoes={
          <>
            <Link
              href={`/cantos-da-torcida/${canto.slug}`}
              target="_blank"
              className="text-sm whitespace-nowrap text-link hover:underline"
            >
              ver no site ↗
            </Link>
            <Link
              href="/admin/cantos"
              className="text-sm whitespace-nowrap text-link hover:underline"
            >
              ← voltar aos cantos
            </Link>
          </>
        }
      >
        {canto.title}
      </TituloDaTela>

      {salvo && <Aviso>Alterações salvas.</Aviso>}
      {erro && <Aviso tom="alerta">Título e letra são obrigatórios — nada foi salvo.</Aviso>}

      <FormularioDeCanto acao={salvarCanto} canto={canto} />

      {/*
        Formulário separado, fora do de edição: remover não pode dividir o mesmo
        submit que salvar.
      */}
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <form action={removerCanto.bind(null, canto.id)}>
          <Botao type="submit" variante="perigo">
            Remover canto
          </Botao>
        </form>
        <p className="text-xs text-muted">
          Remoção é definitiva — canto não é recoletado por scraper, então não volta sozinho.
        </p>
      </div>
    </>
  );
}
