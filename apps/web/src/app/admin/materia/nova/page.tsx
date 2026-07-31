import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";

import { criarMateria } from "../../actions";

export default function NovaMateriaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Formulario />
    </Suspense>
  );
}

async function Formulario() {
  if (!(await sessaoValida())) redirect("/admin/login");

  return (
    <>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-link hover:underline">
          ← Voltar para a lista
        </Link>
      </div>

      <h1 className="font-display text-2xl font-extrabold">Nova matéria da redação</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Conteúdo autoral do NETFOR — avisos do portal, tutoriais, análises, especiais. Não passa
        pela coleta nem pela reescrita: o texto é seu do começo ao fim.
      </p>

      <form action={criarMateria} className="space-y-4">
        <div>
          <label htmlFor="titulo" className="text-xs font-semibold text-muted uppercase">
            Título
          </label>
          <input
            id="titulo"
            name="titulo"
            required
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-display text-lg font-bold"
          />
          <p className="mt-1 text-xs text-muted">O endereço da página é gerado a partir daqui.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="categoria" className="text-xs font-semibold text-muted uppercase">
              Categoria
            </label>
            <input
              id="categoria"
              name="categoria"
              placeholder="Ex.: Portal, Tutorial, Análise"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="imagemUrl" className="text-xs font-semibold text-muted uppercase">
              URL da capa
            </label>
            <input
              id="imagemUrl"
              name="imagemUrl"
              placeholder="Vazio usa o banner do NETFOR"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="resumo" className="text-xs font-semibold text-muted uppercase">
            Resumo (linha fina e meta description)
          </label>
          <textarea
            id="resumo"
            name="resumo"
            rows={2}
            required
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="conteudo" className="text-xs font-semibold text-muted uppercase">
            Texto
          </label>
          <textarea
            id="conteudo"
            name="conteudo"
            rows={18}
            required
            placeholder={"Um parágrafo por bloco.\n\nSepare os parágrafos com uma linha em branco."}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm leading-relaxed"
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            type="submit"
            className="h-10 rounded-lg border border-line px-5 text-sm font-semibold hover:border-primary/50"
          >
            Salvar como rascunho
          </button>
          <button
            type="submit"
            name="publicar"
            value="1"
            className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white"
          >
            Publicar agora
          </button>
        </div>
      </form>
    </>
  );
}
