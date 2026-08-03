import { publicacaoAutomaticaLigada } from "@netfor/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  contarPorEstado,
  ESTADOS,
  listarMaterias,
  ROTULO_ESTADO,
  type Estado,
} from "@/modules/admin/queries";

import { arquivar, devolverParaRevisao, publicar } from "./actions";
import { BarraDeLote } from "./barra-de-lote";
import { InterruptorAutomatico } from "./interruptor-automatico";
import { Aviso, BotaoLink, BotaoMini, Cartao, TituloDaTela, Vazio } from "./ui";

type Busca = Promise<{
  estado?: string;
  q?: string;
  pagina?: string;
  salvo?: string;
  lote?: string;
  pedidas?: string;
}>;

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

  const [lista, contagem, automatico] = await Promise.all([
    listarMaterias({ estado, busca, pagina }),
    contarPorEstado(),
    publicacaoAutomaticaLigada(db),
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

  // Para onde as ações devolvem o operador: mesma aba, mesma busca, mesma
  // página. Sem isto, publicar um item na página 3 jogava de volta na 1.
  const urlAtual = query({ pagina });

  const feitas = Number.parseInt(params.lote ?? "", 10);
  const pedidas = Number.parseInt(params.pedidas ?? "", 10);
  const ignoradas = Number.isInteger(feitas) && Number.isInteger(pedidas) ? pedidas - feitas : 0;

  return (
    <>
      <TituloDaTela
        descricao="Fila de reescrita, publicação e lixeira."
        acoes={
          <BotaoLink href="/admin/materia/nova" variante="primario">
            + Nova matéria
          </BotaoLink>
        }
      >
        Matérias
      </TituloDaTela>

      {params.salvo && <Aviso>Alterações salvas.</Aviso>}

      {Number.isInteger(feitas) && (
        <Aviso>
          {feitas} matéria{feitas === 1 ? "" : "s"} atualizada{feitas === 1 ? "" : "s"}.
          {ignoradas > 0 && (
            <span className="text-muted">
              {" "}
              {ignoradas} ficou{ignoradas === 1 ? "" : "ram"} de fora por não ter texto próprio —
              rode a reescrita ou escreva o texto antes de publicar.
            </span>
          )}
        </Aviso>
      )}

      <InterruptorAutomatico ligado={automatico} voltar={urlAtual} />

      {/* Rola na horizontal no celular: quatro abas com contagem não cabem em
          320px, e quebrar rótulo de navegação em duas linhas parece defeito. */}
      <nav aria-label="Filtrar por estado" className="-mx-4 mb-4 overflow-x-auto px-4">
        <ul className="flex min-w-max gap-2">
          {ESTADOS.map((e) => (
            <li key={e}>
              <Link
                href={`/admin?estado=${e}`}
                aria-current={e === estado ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-[--radius-pill] border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  e === estado
                    ? "border-primary/50 bg-primary/10 text-primary-text"
                    : "border-line text-muted hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {ROTULO_ESTADO[e]} <span className="tabular-nums opacity-70">{contagem[e]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form action="/admin" className="mb-6 flex gap-2">
        <input type="hidden" name="estado" value={estado} />
        <input
          name="q"
          defaultValue={busca ?? ""}
          placeholder="Buscar por título ou resumo…"
          aria-label="Buscar matérias"
          className="min-w-0 flex-1 rounded-[--radius-card] border border-line bg-surface px-3 py-2 text-sm hover:border-primary/40 focus:border-primary/60"
        />
        <button
          type="submit"
          className="inline-flex h-9 shrink-0 items-center border border-line px-4 text-sm font-semibold whitespace-nowrap hover:border-primary/50 hover:bg-surface-2"
        >
          Buscar
        </button>
      </form>

      {lista.itens.length === 0 ? (
        <Vazio>
          {busca
            ? "Nenhuma matéria para essa busca."
            : estado === "hidden"
              ? "A lixeira está vazia."
              : "Nenhuma matéria neste estado."}
        </Vazio>
      ) : (
        /**
         * UM formulário para a lista inteira. As caixas de seleção e os botões
         * de cada item convivem aqui porque formulário aninhado não é HTML
         * válido — por isso as ações de item recebem id e slug por `.bind()`
         * em vez de campo oculto.
         *
         * `voltar` leva filtro, busca e página: as ações redirecionam para cá
         * depois de escrever, e sem isso o operador cairia sempre na primeira
         * aba.
         */
        <form>
          <input type="hidden" name="voltar" value={urlAtual} />
          <BarraDeLote estado={estado} />

          <ul className="space-y-3">
            {lista.itens.map((m) => (
              <li key={m.id}>
                <Cartao className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                  <label className="flex shrink-0 items-start pt-1">
                    <input
                      type="checkbox"
                      name="ids"
                      value={m.id}
                      className="size-4 accent-[var(--brand-red)]"
                      aria-label={`Selecionar: ${m.titulo}`}
                    />
                  </label>

                  {/* Capa: é o que faltava para avaliar a matéria sem abrir.
                      Some abaixo de `sm` — em 320px ela come metade da linha e
                      o título fica com quatro palavras por linha. */}
                  <div className="relative hidden h-20 w-32 shrink-0 overflow-hidden rounded-[--radius-card] border border-line bg-surface-2 sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element -- painel interno: sem otimizador, evita gastar transformação em thumb administrativa */}
                    <img
                      src={m.imagemUrl ?? "/netfor-banner.jpeg"}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <span className="rounded-[--radius-card] bg-surface-2 px-2 py-0.5 font-medium">
                        {m.veiculo}
                      </span>
                      {m.categoria && <span>{m.categoria}</span>}
                      {m.temTextoProprio ? (
                        <span className="text-primary-text">
                          texto próprio · {m.tamanhoTexto} car.
                        </span>
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

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <BotaoMini
                        type="submit"
                        formAction={publicar.bind(null, m.id, m.slug)}
                        variante={m.estado === "published" ? "fantasma" : "primario"}
                        disabled={m.estado === "published" || !m.temTextoProprio}
                        title={
                          m.temTextoProprio
                            ? undefined
                            : "Sem texto próprio: rode a reescrita ou escreva o texto antes."
                        }
                      >
                        Publicar
                      </BotaoMini>

                      {/*
                        Um só botão para os dois nomes do mesmo movimento: na
                        revisão é "Descartar", no ar é "Despublicar". Os dois
                        mandam para a lixeira, de onde dá para voltar.
                      */}
                      {m.estado === "hidden" ? (
                        <BotaoMini
                          type="submit"
                          formAction={devolverParaRevisao.bind(null, m.id, m.slug)}
                        >
                          Restaurar
                        </BotaoMini>
                      ) : (
                        <BotaoMini
                          type="submit"
                          formAction={arquivar.bind(null, m.id, m.slug)}
                          variante="perigo"
                        >
                          {m.estado === "published" ? "Despublicar" : "Descartar"}
                        </BotaoMini>
                      )}

                      <Link
                        href={`/admin/materia/${m.id}`}
                        className="text-xs font-medium text-link hover:underline"
                      >
                        editar
                      </Link>

                      {m.estado === "published" && (
                        <Link
                          href={`/noticias/${m.slug}`}
                          target="_blank"
                          className="text-xs text-link hover:underline"
                        >
                          ver no site ↗
                        </Link>
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
                </Cartao>
              </li>
            ))}
          </ul>
        </form>
      )}

      {estado === "hidden" && lista.itens.length > 0 && (
        <p className="mt-4 text-xs text-muted">
          A lixeira não esvazia sozinha e não tem apagar definitivo: o endereço original é o que
          impede o scraper de recoletar a mesma matéria. Apagar a linha faria ela voltar na próxima
          coleta.
        </p>
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
