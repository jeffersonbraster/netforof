import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";
import { formatShortDateTime } from "@/lib/format";
import { buscarMateria, ROTULO_ESTADO } from "@/modules/admin/queries";

import { despublicar, devolverParaRevisao, salvar } from "../../actions";

type Params = Promise<{ id: string }>;
type Busca = Promise<{ salvo?: string }>;

export default function EditarPage(props: { params: Params; searchParams: Busca }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Editor {...props} />
    </Suspense>
  );
}

async function Editor({ params, searchParams }: { params: Params; searchParams: Busca }) {
  if (!(await sessaoValida())) redirect("/admin/login");

  const { id } = await params;
  const { salvo } = await searchParams;
  const numero = Number.parseInt(id, 10);
  if (!Number.isInteger(numero)) notFound();

  const materia = await buscarMateria(numero);
  if (!materia) notFound();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/admin?estado=${materia.estado}`} className="text-sm text-link hover:underline">
          ← Voltar para a lista
        </Link>
        <span className="rounded-lg border border-line px-3 py-1 text-xs font-medium text-muted">
          {ROTULO_ESTADO[materia.estado]}
        </span>
      </div>

      {salvo && (
        <p className="mb-4 rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm">
          Alterações salvas.
        </p>
      )}

      <div className="mb-4 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
        <p>
          <strong className="text-foreground">{materia.veiculo}</strong> ·{" "}
          {formatShortDateTime(materia.publicadaEm)}
          {materia.modelo && ` · ${materia.modelo}`}
          {materia.reescritaEm && ` · reescrita em ${formatShortDateTime(materia.reescritaEm)}`}
        </p>
        <a
          href={materia.urlOriginal}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link hover:underline"
        >
          Abrir matéria original ↗
        </a>
      </div>

      <form action={salvar} className="space-y-4">
        <input type="hidden" name="id" value={materia.id} />
        <input type="hidden" name="slug" value={materia.slug} />

        <section className="rounded-xl border border-line bg-surface p-4">
          <h2 className="mb-3 font-display text-sm font-bold uppercase">Capa</h2>
          <div className="flex flex-wrap gap-4">
            <div className="relative aspect-video w-64 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- painel interno: sem otimizador, a URL muda a cada edição */}
              <img
                src={materia.imagemUrl ?? "/netfor-banner.jpeg"}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-64 flex-1">
              <label htmlFor="imagemUrl" className="text-xs font-semibold text-muted uppercase">
                URL da imagem
              </label>
              <input
                id="imagemUrl"
                name="imagemUrl"
                defaultValue={materia.imagemUrl ?? ""}
                placeholder="Vazio usa o banner do NETFOR"
                className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
              />
              <p className="mt-2 text-xs text-muted">
                A foto é do veículo de origem e aparece creditada na matéria. Se estiver
                inadequada, apague o campo para usar o banner próprio.
              </p>
            </div>
          </div>
        </section>

        <div>
          <label htmlFor="titulo" className="text-xs font-semibold text-muted uppercase">
            Título
          </label>
          <input
            id="titulo"
            name="titulo"
            defaultValue={materia.titulo}
            required
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-display text-lg font-bold"
          />
        </div>

        <div>
          <label htmlFor="categoria" className="text-xs font-semibold text-muted uppercase">
            Categoria
          </label>
          <input
            id="categoria"
            name="categoria"
            defaultValue={materia.categoria ?? ""}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="resumo" className="text-xs font-semibold text-muted uppercase">
            Resumo (linha fina e meta description)
          </label>
          <textarea
            id="resumo"
            name="resumo"
            rows={2}
            defaultValue={materia.resumo}
            required
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="conteudo" className="text-xs font-semibold text-muted uppercase">
            Texto · {materia.conteudo ? materia.conteudo.split(/\n\s*\n/).length : 0} parágrafos ·{" "}
            {materia.tamanhoTexto} caracteres
          </label>
          <textarea
            id="conteudo"
            name="conteudo"
            rows={18}
            defaultValue={materia.conteudo}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm leading-relaxed"
          />
          <p className="mt-1 text-xs text-muted">
            Parágrafos separados por linha em branco. Declaração entre aspas pode ficar
            idêntica ao original, desde que atribuída a quem falou.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            type="submit"
            className="h-10 rounded-lg border border-line px-5 text-sm font-semibold hover:border-primary/50"
          >
            Salvar
          </button>
          <button
            type="submit"
            name="publicar"
            value="1"
            className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white"
          >
            {materia.estado === "published" ? "Salvar (segue no ar)" : "Salvar e publicar"}
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        {materia.estado === "published" && (
          <>
            {/* id e slug vão por `.bind()` — mesma assinatura usada na lista,
                onde campo oculto não serve porque tudo vive num formulário só. */}
            <form action={despublicar.bind(null, materia.id, materia.slug)}>
              <input type="hidden" name="voltar" value={`/admin/materia/${materia.id}`} />
              <button
                type="submit"
                className="h-9 rounded-lg border border-line px-4 text-sm font-medium text-muted hover:border-primary/50"
              >
                Despublicar
              </button>
            </form>
            <Link
              href={`/noticias/${materia.slug}`}
              target="_blank"
              className="flex h-9 items-center text-sm text-link hover:underline"
            >
              Ver no site ↗
            </Link>
          </>
        )}
        {materia.estado !== "review" && (
          <form action={devolverParaRevisao.bind(null, materia.id, materia.slug)}>
            <input type="hidden" name="voltar" value={`/admin/materia/${materia.id}`} />
            <button
              type="submit"
              className="h-9 rounded-lg border border-line px-4 text-sm font-medium hover:border-primary/50"
            >
              Voltar para revisão
            </button>
          </form>
        )}
      </div>
    </>
  );
}
