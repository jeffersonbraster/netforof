import { fixarNoDestaque } from "./actions";

/**
 * Fixar a matéria numa posição do destaque.
 *
 * Três botões numerados e um para soltar. `formAction` com `.bind()`, e não um
 * formulário próprio: a lista inteira já é UM formulário (as caixas de seleção
 * do lote precisam disso), e formulário aninhado não é HTML válido.
 *
 * O botão da posição já ocupada por ESTA matéria vira o botão de soltar — clicar
 * de novo em "1" quando ela já está em 1 é o gesto natural para desfazer, e sem
 * isso o operador precisaria mirar num quarto alvo só para cancelar.
 *
 * `slots` risca visualmente as posições que o modo atual não usa. Não desabilita:
 * fixar em 3 com o modo em `uma` é legítimo — fica guardado para quando o modo
 * voltar. Desabilitar esconderia essa possibilidade.
 */
export function FixarDestaque({
  id,
  pino,
  slots,
  publicada,
}: {
  id: number;
  pino: number | null;
  slots: number;
  publicada: boolean;
}) {
  if (!publicada) return null;

  return (
    <span className="flex flex-wrap items-center gap-1">
      <span className="mr-0.5 text-[11px] text-muted">Fixar:</span>

      {[1, 2, 3].map((posicao) => {
        const ativa = pino === posicao;
        const foraDoModo = posicao > slots;

        return (
          <button
            key={posicao}
            type="submit"
            // Clicar na posição já ativa solta — desfazer sem alvo novo.
            formAction={fixarNoDestaque.bind(null, id, ativa ? null : posicao)}
            aria-pressed={ativa}
            title={
              ativa
                ? `Fixada na posição ${posicao} — clique para soltar`
                : foraDoModo
                  ? `Fixar na posição ${posicao} (o modo atual não usa esta posição; fica guardada)`
                  : `Fixar na posição ${posicao}`
            }
            className={`inline-flex size-6 items-center justify-center rounded-[--radius-card] border text-[11px] font-bold tabular-nums transition-colors ${
              ativa
                ? "border-primary bg-primary text-white"
                : "border-line text-muted hover:border-primary/50 hover:text-foreground"
            } ${foraDoModo && !ativa ? "opacity-45" : ""}`}
          >
            {posicao}
          </button>
        );
      })}

      {pino !== null && (
        <button
          type="submit"
          formAction={fixarNoDestaque.bind(null, id, null)}
          className="ml-0.5 text-[11px] text-muted underline underline-offset-2 hover:text-foreground"
        >
          soltar
        </button>
      )}
    </span>
  );
}
