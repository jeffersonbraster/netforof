import { alternarEstrela } from "./actions";

/**
 * A estrela editorial.
 *
 * Marca a matéria como "merece o destaque". As estreladas entram nos slots que a
 * fixação deixou livres, da mais recente para a mais antiga; sem nenhuma, o
 * destaque volta a ser as mais novas.
 *
 * ---------------------------------------------------------------------------
 * DUAS APRESENTAÇÕES, UM CONTROLE
 * ---------------------------------------------------------------------------
 * A capa da matéria é `hidden sm:block` no painel — em 320px ela come metade da
 * linha. Então a estrela sobre a capa simplesmente não existiria no celular, que
 * é onde o editor mais mexe no portal em dia de jogo. Daí as duas variantes:
 * `sobreposta` vive no canto da capa a partir de `sm`, `inline` aparece na fila
 * de botões abaixo de `sm`. Só uma está visível por vez.
 *
 * ---------------------------------------------------------------------------
 * O ESTADO NÃO DEPENDE SÓ DA COR
 * ---------------------------------------------------------------------------
 * Estrela cheia (★) contra vazada (☆), além do amarelo e do `aria-pressed`.
 * Quem não distingue as cores lê a forma; quem usa leitor de tela ouve o estado.
 * Cor sozinha reprovaria no critério 1.4.1 da WCAG.
 */
export function Estrela({
  id,
  estrelada,
  variante,
}: {
  id: number;
  estrelada: boolean;
  variante: "sobreposta" | "inline";
}) {
  const rotulo = estrelada
    ? "Tirar do destaque editorial"
    : "Marcar como destaque editorial";

  if (variante === "sobreposta") {
    return (
      <button
        type="submit"
        formAction={alternarEstrela.bind(null, id, !estrelada)}
        aria-pressed={estrelada}
        aria-label={rotulo}
        title={rotulo}
        // Alvo de 28px sobre a capa, com véu escuro por baixo: a estrela precisa
        // ser legível tanto sobre foto clara quanto escura.
        className={`absolute top-1 left-1 z-10 inline-flex size-7 items-center justify-center rounded-[--radius-card] bg-black/60 text-base leading-none backdrop-blur-[2px] transition-colors hover:bg-black/80 ${
          estrelada ? "text-yellow-300" : "text-white/80"
        }`}
      >
        <span aria-hidden>{estrelada ? "★" : "☆"}</span>
      </button>
    );
  }

  return (
    <button
      type="submit"
      formAction={alternarEstrela.bind(null, id, !estrelada)}
      aria-pressed={estrelada}
      title={rotulo}
      className={`inline-flex h-7 items-center gap-1 rounded-[--radius-card] border px-2 text-[11px] font-semibold transition-colors ${
        estrelada
          ? "border-yellow-400/60 bg-yellow-400/15 text-yellow-300"
          : "border-line text-muted hover:border-primary/50 hover:text-foreground"
      }`}
    >
      <span aria-hidden>{estrelada ? "★" : "☆"}</span>
      Destaque
    </button>
  );
}
