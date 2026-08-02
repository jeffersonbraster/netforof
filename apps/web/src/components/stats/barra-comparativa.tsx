/**
 * Comparação casa × fora de uma métrica só.
 *
 * A barra existe porque o número sozinho não conta a história: "37%" e "75%"
 * lidos em sequência exigem que o leitor faça a conta. Lado a lado, com
 * comprimento proporcional, a diferença é imediata — que é o achado da página.
 *
 * A barra é `aria-hidden`: quem usa leitor de tela recebe o valor pelo texto,
 * que já está ali. Uma barra anunciada seria ruído duplicado.
 */
export function BarraComparativa({
  metrica,
  casa,
  fora,
  sufixo = "%",
  detalheCasa,
  detalheFora,
}: {
  metrica: string;
  casa: number;
  fora: number;
  sufixo?: string;
  detalheCasa: string;
  detalheFora: string;
}) {
  // Escala pelo maior dos dois, não por 100: em métricas de média (1,88 gol) o
  // teto de 100 achataria as duas barras a nada.
  const teto = Math.max(casa, fora) || 1;
  const largura = (valor: number) => `${Math.max(4, (valor / teto) * 100)}%`;

  const linha = (
    rotulo: string,
    valor: number,
    detalhe: string,
    cor: string,
    alinhamento: string,
  ) => (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-xs font-bold tracking-wide text-muted uppercase">
          {rotulo}
        </span>
        <span className="font-display text-xl leading-none font-extrabold tabular-nums">
          {valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
          {sufixo}
        </span>
      </div>
      <div className="mt-1.5 h-2 bg-surface-2" aria-hidden>
        <div className={`h-full ${cor} ${alinhamento}`} style={{ width: largura(valor) }} />
      </div>
      <p className="mt-1 text-xs text-muted">{detalhe}</p>
    </div>
  );

  return (
    <div className="border-t border-line py-5">
      <h3 className="mb-3 font-display text-sm font-bold tracking-wide uppercase">{metrica}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {linha("Em casa", casa, detalheCasa, "bg-primary", "")}
        {linha("Fora", fora, detalheFora, "bg-secondary", "")}
      </div>
    </div>
  );
}
