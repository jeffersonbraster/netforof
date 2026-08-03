"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { arquivarSelecionadas, publicarSelecionadas, restaurarSelecionadas } from "./actions";

/**
 * Barra de seleção em lote.
 *
 * As caixas de seleção ficam nos itens da lista, que são renderizados no
 * servidor. Em vez de transformar a lista inteira em componente de cliente só
 * para carregar esse estado, este componente observa o formulário que o
 * envolve. É o pedaço menor possível de JS: a lista continua sendo HTML do
 * servidor, e só a contagem e os botões precisam de interatividade.
 */

function BotaoDeLote({
  acao,
  quantas,
  children,
  variante,
}: {
  acao: (dados: FormData) => Promise<void>;
  quantas: number;
  children: React.ReactNode;
  variante: "primaria" | "secundaria" | "perigo";
}) {
  const { pending } = useFormStatus();
  const desabilitado = quantas === 0 || pending;

  const tom = {
    primaria: "bg-primary text-white hover:bg-primary/90",
    secundaria: "border border-line text-muted hover:border-primary/50 hover:text-foreground",
    perigo: "border border-line text-primary-text hover:border-primary/60 hover:bg-primary/10",
  }[variante];

  return (
    <button
      type="submit"
      formAction={acao}
      disabled={desabilitado}
      className={`inline-flex h-9 items-center whitespace-nowrap px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tom}`}
    >
      {children}
    </button>
  );
}

export function BarraDeLote({ estado }: { estado: string }) {
  const ancora = useRef<HTMLDivElement>(null);
  const [selecionadas, setSelecionadas] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const form = ancora.current?.closest("form");
    if (!form) return;

    const caixas = () => Array.from(form.querySelectorAll<HTMLInputElement>('input[name="ids"]'));
    const recontar = () => {
      const todas = caixas();
      setTotal(todas.length);
      setSelecionadas(todas.filter((c) => c.checked).length);
    };

    recontar();
    // Delegação no formulário: pega qualquer caixa, inclusive as que entram
    // depois de uma navegação, sem precisar de listener por item.
    form.addEventListener("change", recontar);
    return () => form.removeEventListener("change", recontar);
  }, []);

  const alternarTodas = (marcar: boolean) => {
    const form = ancora.current?.closest("form");
    if (!form) return;
    for (const caixa of form.querySelectorAll<HTMLInputElement>('input[name="ids"]')) {
      caixa.checked = marcar;
    }
    setSelecionadas(marcar ? total : 0);
  };

  const todasMarcadas = total > 0 && selecionadas === total;

  return (
    <div
      ref={ancora}
      className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[--radius-card] border border-line bg-surface-2/95 px-3 py-2 backdrop-blur"
    >
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={todasMarcadas}
          onChange={(e) => alternarTodas(e.target.checked)}
          // `indeterminate` só existe em JS, não em atributo — é o estado certo
          // para "algumas marcadas" e evita a caixa parecer vazia com 3 de 20.
          ref={(el) => {
            if (el) el.indeterminate = selecionadas > 0 && !todasMarcadas;
          }}
          className="size-4 accent-[var(--brand-red)]"
          aria-label="Selecionar todas desta página"
        />
        Selecionar todas
      </label>

      <span aria-live="polite" className="text-sm text-muted tabular-nums">
        {selecionadas} de {total} selecionada{selecionadas === 1 ? "" : "s"}
      </span>

      {/*
        Os pares mudam por aba porque o movimento útil muda: na revisão é aprovar
        ou descartar; no ar é tirar do ar; na lixeira é restaurar. Rótulo curto —
        "Publicar", não "Publicar selecionadas": a contagem ao lado já diz sobre
        o quê, e o rótulo longo quebrava em duas linhas no celular.
      */}
      <div className="ml-auto flex items-center gap-2">
        {estado !== "published" && estado !== "hidden" && (
          <BotaoDeLote acao={publicarSelecionadas} quantas={selecionadas} variante="primaria">
            Publicar
          </BotaoDeLote>
        )}
        {estado === "hidden" ? (
          <BotaoDeLote acao={restaurarSelecionadas} quantas={selecionadas} variante="secundaria">
            Restaurar
          </BotaoDeLote>
        ) : (
          <BotaoDeLote acao={arquivarSelecionadas} quantas={selecionadas} variante="perigo">
            {estado === "published" ? "Despublicar" : "Descartar"}
          </BotaoDeLote>
        )}
      </div>
    </div>
  );
}
