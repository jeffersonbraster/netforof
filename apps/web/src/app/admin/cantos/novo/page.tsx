import { chants, desc } from "@netfor/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";
import { db } from "@/lib/db";

import { TituloDaTela, Aviso } from "../../ui";
import { criarCanto } from "../actions";
import { FormularioDeCanto } from "../formulario";

type Busca = Promise<{ erro?: string }>;

export default function NovoCantoPage({ searchParams }: { searchParams: Busca }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Tela searchParams={searchParams} />
    </Suspense>
  );
}

async function Tela({ searchParams }: { searchParams: Busca }) {
  if (!(await sessaoValida())) redirect("/admin/login");
  const { erro } = await searchParams;

  // Sugere a próxima posição com folga de 10, para caber inserção no meio depois
  // sem renumerar a lista inteira.
  const [ultimo] = await db
    .select({ ordem: chants.order })
    .from(chants)
    .orderBy(desc(chants.order))
    .limit(1);

  return (
    <>
      <TituloDaTela
        descricao="Entra direto na página pública assim que salvar."
        acoes={
          <Link href="/admin/cantos" className="text-sm whitespace-nowrap text-link hover:underline">
            ← voltar aos cantos
          </Link>
        }
      >
        Novo canto
      </TituloDaTela>

      {erro && <Aviso tom="alerta">Título e letra são obrigatórios — nada foi salvo.</Aviso>}

      <FormularioDeCanto acao={criarCanto} ordemSugerida={(ultimo?.ordem ?? 0) + 10} />
    </>
  );
}
