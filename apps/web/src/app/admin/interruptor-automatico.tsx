import { alternarPublicacaoAutomatica } from "./actions";

/**
 * Interruptor da publicação automática.
 *
 * Sem JS de propósito: é um formulário que envia e volta pela mesma rota das
 * outras ações do painel. Um estado que decide o que vai ao ar sozinho não
 * deveria depender de hidratação para refletir a verdade — do jeito que está,
 * o que aparece na tela é sempre o que está gravado no banco.
 *
 * `role="switch"` + `aria-checked` porque visualmente é um interruptor; sem
 * isso o leitor de tela anuncia só "botão" e não diz se está ligado.
 */
export function InterruptorAutomatico({ ligado, voltar }: { ligado: boolean; voltar: string }) {
  return (
    <form
      action={alternarPublicacaoAutomatica}
      className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface p-3"
    >
      <input type="hidden" name="voltar" value={voltar} />
      <input type="hidden" name="ligar" value={ligado ? "0" : "1"} />

      <button
        type="submit"
        role="switch"
        aria-checked={ligado}
        className="flex items-center gap-3 text-left"
      >
        <span
          aria-hidden
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
            ligado ? "border-primary bg-primary" : "border-line bg-surface-2"
          }`}
        >
          <span
            className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
              ligado ? "left-[1.5rem]" : "left-0.5"
            }`}
          />
        </span>
        <span className="text-sm font-semibold">
          Publicação automática{" "}
          <span className={ligado ? "text-primary-text" : "text-muted"}>
            {ligado ? "ligada" : "desligada"}
          </span>
        </span>
      </button>

      <p className="text-xs text-muted">
        {ligado
          ? "Matéria nova entra no ar assim que a IA escreve o texto — as travas de originalidade e de menção a veículo continuam valendo. Nada do que já está aguardando revisão foi publicado."
          : "Matéria nova para em “Aguardando revisão” até você aprovar."}
      </p>
    </form>
  );
}
