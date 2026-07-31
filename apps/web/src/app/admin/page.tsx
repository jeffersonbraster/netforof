import { redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";
import { contarPorEstado, listarParaRevisao } from "@/modules/admin/queries";

import { aprovar, editarEPublicar, reprovar, sair } from "./actions";

/**
 * O gate vive dentro de <Suspense> porque, com Cache Components, ler cookie fora
 * de um boundary é erro de build — e `dynamic = "force-dynamic"` deixou de
 * existir nesse modo. O shell pré-renderizado não carrega nada sensível: a fila
 * só é consultada depois da sessão conferida.
 */
export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando fila…</p>}>
      <FilaProtegida />
    </Suspense>
  );
}

async function FilaProtegida() {
  if (!(await sessaoValida())) redirect("/admin/login");

  const [fila, contagem] = await Promise.all([listarParaRevisao(), contarPorEstado()]);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Fila de revisão</h1>
          <p className="mt-1 text-sm text-muted">
            {contagem.review} aguardando · {contagem.draft} sem texto · {contagem.published} no ar ·{" "}
            {contagem.hidden} descartadas
          </p>
        </div>
        <form action={sair}>
          <button type="submit" className="text-sm text-link hover:underline">
            Sair
          </button>
        </form>
      </header>

      {fila.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          Nada para revisar agora.
        </p>
      ) : (
        <div className="space-y-8">
          {fila.map((materia) => (
            <article key={materia.id} className="rounded-xl border border-line bg-surface p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded bg-surface-2 px-2 py-0.5 font-medium">
                  {materia.veiculo}
                </span>
                {materia.categoria && <span>{materia.categoria}</span>}
                {materia.modelo && <span>· {materia.modelo}</span>}
                <a
                  href={materia.urlOriginal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link hover:underline"
                >
                  ver original ↗
                </a>
              </div>

              {/* Um form só: editar e publicar, ou publicar como está. */}
              <form action={editarEPublicar} className="space-y-3">
                <input type="hidden" name="id" value={materia.id} />
                <input type="hidden" name="slug" value={materia.slug} />

                <div>
                  <label
                    htmlFor={`titulo-${materia.id}`}
                    className="text-xs font-semibold text-muted uppercase"
                  >
                    Título
                  </label>
                  <input
                    id={`titulo-${materia.id}`}
                    name="titulo"
                    defaultValue={materia.titulo}
                    className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 font-display font-bold"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`resumo-${materia.id}`}
                    className="text-xs font-semibold text-muted uppercase"
                  >
                    Resumo
                  </label>
                  <textarea
                    id={`resumo-${materia.id}`}
                    name="resumo"
                    rows={2}
                    defaultValue={materia.resumo}
                    className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`conteudo-${materia.id}`}
                    className="text-xs font-semibold text-muted uppercase"
                  >
                    Texto ({materia.conteudo.split(/\n\s*\n/).length} parágrafos ·{" "}
                    {materia.conteudo.length} caracteres)
                  </label>
                  <textarea
                    id={`conteudo-${materia.id}`}
                    name="conteudo"
                    rows={14}
                    defaultValue={materia.conteudo}
                    className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white"
                >
                  Salvar e publicar
                </button>
              </form>

              <div className="mt-3 flex gap-2 border-t border-line pt-3">
                <form action={aprovar}>
                  <input type="hidden" name="id" value={materia.id} />
                  <input type="hidden" name="slug" value={materia.slug} />
                  <button
                    type="submit"
                    className="h-9 rounded-lg border border-line px-4 text-sm font-medium hover:border-primary/50"
                  >
                    Publicar sem alterar
                  </button>
                </form>
                <form action={reprovar}>
                  <input type="hidden" name="id" value={materia.id} />
                  <button
                    type="submit"
                    className="h-9 rounded-lg border border-line px-4 text-sm font-medium text-muted hover:border-primary/50"
                  >
                    Descartar
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
