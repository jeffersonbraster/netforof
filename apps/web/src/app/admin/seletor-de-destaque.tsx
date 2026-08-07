import { DESTAQUE_LAYOUTS, SLOTS_POR_LAYOUT, type DestaqueLayout } from "@netfor/db";

import { definirModoDestaque } from "./actions";

/**
 * Escolha da composição do destaque da home.
 *
 * Sem JS, pelo mesmo motivo do interruptor de publicação automática: o que a
 * tela mostra é sempre o que está gravado, sem depender de hidratação. Cada modo
 * é um `submit` próprio dentro do mesmo formulário.
 *
 * O DESENHO É O ARGUMENTO. Um `<select>` com quatro nomes obrigaria o operador a
 * decorar o que "duas" significa; o diagrama mostra. São retângulos em proporção
 * fiel ao que a home vai fazer — a mesma proporção 1.6/1 do modo de três, o
 * 50/50 do de duas, o bloco inteiro do de uma, e a faixa sangrando dos dois
 * lados no uber. Dá para escolher pelo formato sem ler o rótulo.
 */

const MODOS: Record<DestaqueLayout, { nome: string; explicacao: string }> = {
  tres: {
    nome: "Três matérias",
    explicacao: "Manchete grande e duas ao lado. O dia normal.",
  },
  duas: {
    nome: "Duas matérias",
    explicacao: "Dois assuntos de peso igual, metade da área cada.",
  },
  uma: {
    nome: "Uma matéria",
    explicacao: "Um assunto domina a área inteira do destaque.",
  },
  uber: {
    nome: "Uber · faixa de plantão",
    explicacao: "Rompe a margem da página, em cor cheia. Para o que interrompe o dia.",
  },
};

/** Miniatura da composição. `currentColor` para herdar o estado de seleção. */
function Diagrama({ layout }: { layout: DestaqueLayout }) {
  const bloco = "rounded-[1px] bg-current";

  if (layout === "uber") {
    return (
      <span aria-hidden className="flex h-10 w-full flex-col gap-[3px] opacity-90">
        {/* Sangra: encosta nas duas bordas, sem o respiro que os outros têm. */}
        <span className={`${bloco} -mx-1.5 h-6`} />
        <span className="flex gap-[3px]">
          <span className={`${bloco} h-2 flex-1 opacity-40`} />
          <span className={`${bloco} h-2 flex-1 opacity-40`} />
        </span>
      </span>
    );
  }

  if (layout === "uma") {
    return (
      <span aria-hidden className="flex h-10 w-full opacity-90">
        <span className={`${bloco} h-full w-full`} />
      </span>
    );
  }

  if (layout === "duas") {
    return (
      <span aria-hidden className="flex h-10 w-full gap-[3px] opacity-90">
        <span className={`${bloco} h-full flex-1`} />
        <span className={`${bloco} h-full flex-1`} />
      </span>
    );
  }

  return (
    <span aria-hidden className="flex h-10 w-full gap-[3px] opacity-90">
      {/* 1.6fr / 1fr — a mesma proporção que a home usa de verdade. */}
      <span className={`${bloco} h-full`} style={{ flex: "1.6" }} />
      <span className="flex flex-1 flex-col gap-[3px]">
        <span className={`${bloco} flex-1`} />
        <span className={`${bloco} flex-1`} />
      </span>
    </span>
  );
}

export function SeletorDeDestaque({
  atual,
  voltar,
}: {
  atual: DestaqueLayout;
  voltar: string;
}) {
  return (
    <form
      action={definirModoDestaque}
      className="mb-4 rounded-[--radius-card] border border-line bg-surface p-3"
    >
      <input type="hidden" name="voltar" value={voltar} />

      <div className="mb-3">
        <p className="font-display text-sm font-bold">Destaque da home</p>
        <p className="text-xs text-muted">
          Como a área de manchete é composta. Vale para todo mundo, na hora.
        </p>
      </div>

      {/* 2 colunas no celular e 4 a partir de `sm`: quatro cartões em 320px
          deixariam cada um com 70px, estreito demais para o diagrama ler. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DESTAQUE_LAYOUTS.map((layout) => {
          const selecionado = layout === atual;
          return (
            <button
              key={layout}
              type="submit"
              name="layout"
              value={layout}
              aria-pressed={selecionado}
              className={`flex flex-col gap-2 rounded-[--radius-card] border p-2.5 text-left transition-colors ${
                selecionado
                  ? "border-primary bg-primary/10 text-primary-text"
                  : "border-line text-muted hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Diagrama layout={layout} />
              <span className="font-display text-xs leading-tight font-bold">
                {MODOS[layout].nome}
              </span>
              <span className="text-[11px] leading-snug text-muted">
                {MODOS[layout].explicacao}
              </span>
            </button>
          );
        })}
      </div>

      {/* A ordem de precedência precisa estar escrita: com dois controles
          (pino e estrela) o operador não tem como adivinhar qual vence, e
          descobrir por tentativa é o que faz uma ferramenta parecer errática. */}
      <p className="mt-2.5 text-xs leading-relaxed text-muted">
        Modo atual usa{" "}
        <strong className="text-foreground">
          {SLOTS_POR_LAYOUT[atual]} {SLOTS_POR_LAYOUT[atual] === 1 ? "posição" : "posições"}
        </strong>
        . Quem ocupa: primeiro as <strong className="text-foreground">fixadas</strong> na posição
        exata, depois as <strong className="text-foreground">★ estreladas</strong> da mais recente
        para a mais antiga, e o que sobrar vai para as{" "}
        <strong className="text-foreground">mais novas</strong>. Fixação acima do número de
        posições fica guardada e volta a valer se você trocar de modo.
      </p>
    </form>
  );
}
