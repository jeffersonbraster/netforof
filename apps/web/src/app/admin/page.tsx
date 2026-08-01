import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";
import {
  contarPorEstado,
  ESTADOS,
  listarMaterias,
  ROTULO_ESTADO,
  type Estado,
} from "@/modules/admin/queries";

import { despublicar, devolverParaRevisao, publicar, sair } from "./actions";

type Busca = Promise<{ estado?: string; q?: string; pagina?: string; salvo?: string }>;

/**
 * O gate vive dentro de <Suspense> porque, com Cache Components, ler cookie fora
 * de um boundary é erro de build — e `dynamic = "force-dynamic"` deixou de
 * existir nesse modo. O shell pré-renderizado não carrega nada sensível.
 */
export default function AdminPage({ searchParams }: { searchParams: Busca }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Painel searchParams={searchParams} />
    </Suspense>
  );
}

function ehEstado(v: string | undefined): v is Estado {
  return !!v && (ESTADOS as readonly string[]).includes(v);
}

async function Painel({ searchParams }: { searchParams: Busca }) {
  if (!(await sessaoValida())) redirect("/admin/login");

  const params = await searchParams;
  const estado: Estado = ehEstado(params.estado) ? params.estado : "review";
  const busca = params.q?.trim() || null;
  const pagina = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);

  const [lista, contagem] = await Promise.all([
    listarMaterias({ estado, busca, pagina }),
    contarPorEstado(),
  ]);

  const query = (extra: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    p.set("estado", estado);
    if (busca) p.set("q", busca);
    for (const [k, v] of Object.entries(extra)) {
      if (v === null) p.delete(k);
      else p.set(k, String(v));
    }
    return `/admin?${p.toString()}`;
  };

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold">Painel NETFOR</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/jogos"
            className="h-9 rounded-lg border border-line px-4 text-sm leading-9 font-medium hover:border-primary/50"
          >
            Jogos
          </Link>
          <Link
            href="/admin/materia/nova"
            className="h-9 rounded-lg bg-primary px-4 text-sm leading-9 font-semibold text-white"
          >
            + Nova matéria
          </Link>
        <form action={sair}>
          <button type="submit" className="text-sm text-link hover:underline">
            Sair
          </button>
        </form>
        </div>
      </header>

      {params.salvo && (
        <p className="mb-4 rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm">
          Alterações salvas.
        </p>
      )}

      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
        {ESTADOS.map((e) => (
          <Link
            key={e}
            href={`/admin?estado=${e}`}
            aria-current={e === estado ? "page" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              e === estado
                ? "border-primary/50 bg-primary/10 text-primary-text"
                : "border-line text-muted hover:border-primary/40"
            }`}
          >
            {ROTULO_ESTADO[e]} <span className="tabular-nums">({contagem[e]})</span>
          </Link>
        ))}
      </nav>

      <form action="/admin" className="mb-6 flex gap-2">
        <input type="hidden" name="estado" value={estado} />
        <input
          name="q"
          defaultValue={busca ?? ""}
          placeholder="Buscar por título ou resumo…"
          aria-label="Buscar matérias"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg border border-line px-4 text-sm font-medium hover:border-primary/50"
        >
          Buscar
        </button>
      </form>

      {lista.itens.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          Nenhuma matéria {busca ? "para essa busca" : "neste estado"}.
        </p>
      ) : (
        <ul className="space-y-3">
          {lista.itens.map((m) => (
            <li
              key={m.id}
              className="flex gap-4 rounded-xl border border-line bg-surface p-3 sm:p-4"
            >
              {/* Capa: é o que faltava para avaliar a matéria sem abrir. */}
              <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- painel interno: sem otimizador, evita gastar transformação em thumb administrativa */}
                <img
                  src={m.imagemUrl ?? "/netfor-banner.jpeg"}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="rounded bg-surface-2 px-2 py-0.5 font-medium">{m.veiculo}</span>
                  {m.categoria && <span>{m.categoria}</span>}
                  {m.temTextoProprio ? (
                    <span className="text-primary-text">texto próprio · {m.tamanhoTexto} car.</span>
                  ) : (
                    <span>sem texto próprio</span>
                  )}
                  {!m.imagemUrl && <span>· sem capa</span>}
                </div>

                <Link
                  href={`/admin/materia/${m.id}`}
                  className="font-display leading-snug font-bold hover:text-primary-text"
                >
                  {m.titulo}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{m.resumo}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/materia/${m.id}`}
                    className="rounded-lg border border-line px-3 py-1 text-xs font-medium hover:border-primary/50"
                  >
                    Editar
                  </Link>

                  {m.estado !== "published" && m.temTextoProprio && (
                    <form action={publicar}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="slug" value={m.slug} />
                      <button
                        type="submit"
                        className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white"
                      >
                        Publicar
                      </button>
                    </form>
                  )}

                  {m.estado === "published" && (
                    <>
                      <form action={despublicar}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="slug" value={m.slug} />
                        <button
                          type="submit"
                          className="rounded-lg border border-line px-3 py-1 text-xs font-medium text-muted hover:border-primary/50"
                        >
                          Despublicar
                        </button>
                      </form>
                      <Link
                        href={`/noticias/${m.slug}`}
                        target="_blank"
                        className="text-xs text-link hover:underline"
                      >
                        ver no site ↗
                      </Link>
                    </>
                  )}

                  {m.estado === "hidden" && (
                    <form action={devolverParaRevisao}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="slug" value={m.slug} />
                      <button
                        type="submit"
                        className="rounded-lg border border-line px-3 py-1 text-xs font-medium hover:border-primary/50"
                      >
                        Voltar para revisão
                      </button>
                    </form>
                  )}

                  <a
                    href={m.urlOriginal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-link hover:underline"
                  >
                    original ↗
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {lista.paginas > 1 && (
        <nav aria-label="Paginação" className="mt-6 flex items-center justify-center gap-4 text-sm">
          {pagina > 1 && (
            <Link href={query({ pagina: pagina - 1 })} className="text-link hover:underline">
              ← Anteriores
            </Link>
          )}
          <span className="text-muted">
            Página {lista.pagina} de {lista.paginas} · {lista.total} matérias
          </span>
          {pagina < lista.paginas && (
            <Link href={query({ pagina: pagina + 1 })} className="text-link hover:underline">
              Próximas →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
