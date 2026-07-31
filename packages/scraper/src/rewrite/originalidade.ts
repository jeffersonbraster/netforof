/**
 * Trava de originalidade.
 *
 * "Parece reescrito" não é garantia: medindo 4 matérias reais, uma saiu com 29%
 * de 8-gramas idênticos ao original, incluindo frase inteira copiada. Nenhum
 * texto vai ao ar sem passar por aqui.
 *
 * Duas métricas, porque uma só engana:
 *
 * - **Maior sequência literal.** É a que realmente distingue. Nome de
 *   competição e escalação produzem coincidências longas e inevitáveis
 *   ("copa do nordeste sub 20 de 2026"), mas raramente passam de ~12 palavras.
 *   Frase copiada passa fácil de 16.
 * - **Proporção de 8-gramas.** Pega o caso do texto que copia muitos pedaços
 *   curtos espalhados, sem nenhuma sequência longa isolada.
 *
 * Fato não é protegido por direito autoral; a redação específica é. Estas duas
 * medidas são justamente a distância entre uma coisa e outra.
 */

/** Acima disto, é frase copiada e não coincidência factual. Calibrado em amostra real. */
export const MAX_SEQUENCIA_LITERAL = 14;
/** Proporção de 8-gramas idênticos tolerada. */
export const MAX_RAZAO_8GRAMA = 0.18;

export interface Originalidade {
  maiorSequencia: number;
  razao8grama: number;
  aprovado: boolean;
  motivo: string | null;
  /** Trecho literal mais longo — vai para o log, para dar o que inspecionar. */
  amostra: string | null;
}

function tokenizar(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function ngramas(tokens: string[], n: number): Set<string> {
  const conjunto = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) conjunto.add(tokens.slice(i, i + n).join(" "));
  return conjunto;
}

export function medirOriginalidade(novo: string, original: string): Originalidade {
  const a = tokenizar(novo);
  const b = tokenizar(original);

  if (a.length === 0 || b.length === 0) {
    return { maiorSequencia: 0, razao8grama: 0, aprovado: false, motivo: "texto vazio", amostra: null };
  }

  // Programação dinâmica em uma linha: maior substring comum de palavras.
  let maior = 0;
  let fimEmA = 0;
  let anterior = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const atual = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        const corrida = (anterior[j - 1] ?? 0) + 1;
        atual[j] = corrida;
        if (corrida > maior) {
          maior = corrida;
          fimEmA = i;
        }
      }
    }
    anterior = atual;
  }

  const octogramasNovo = ngramas(a, 8);
  const octogramasOriginal = ngramas(b, 8);
  let repetidos = 0;
  for (const g of octogramasNovo) if (octogramasOriginal.has(g)) repetidos++;
  const razao8grama = octogramasNovo.size > 0 ? repetidos / octogramasNovo.size : 0;

  const amostra = maior > 0 ? a.slice(Math.max(0, fimEmA - maior), fimEmA).join(" ") : null;

  let motivo: string | null = null;
  if (maior > MAX_SEQUENCIA_LITERAL) {
    motivo = `sequência literal de ${maior} palavras (limite ${MAX_SEQUENCIA_LITERAL})`;
  } else if (razao8grama > MAX_RAZAO_8GRAMA) {
    motivo = `${(razao8grama * 100).toFixed(0)}% de 8-gramas idênticos (limite ${(MAX_RAZAO_8GRAMA * 100).toFixed(0)}%)`;
  }

  return { maiorSequencia: maior, razao8grama, aprovado: motivo === null, motivo, amostra };
}
