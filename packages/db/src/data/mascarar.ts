/**
 * Máscara de linguagem ofensiva nas letras.
 *
 * Roda automaticamente no seed, sobre o texto que estiver em `data/cantos.ts`.
 * Automatizar é melhor que editar à mão: vale para faixa nova sem ninguém
 * lembrar de aplicar, e o critério fica em um lugar só, auditável.
 *
 * ATENÇÃO ao alcance disto. Mascarar palavrão é higiene editorial e resolve. Mas
 * mascarar um ATAQUE a torcida rival por orientação sexual não resolve: o alvo e
 * a intenção continuam legíveis para qualquer leitor humano — e a revisão do
 * AdSense em recurso é humana. Por isso a função separa os dois casos e sinaliza
 * quando o segundo aparece, em vez de dar a falsa segurança de "está mascarado".
 */

/** Palavrão: mascarar resolve. */
const PALAVROES = [
  "caralho",
  "porra",
  "buceta",
  "buceto",
  "foda",
  "fodeu",
  "fudeu",
  "merda",
  "puta",
  "cu",
];

/**
 * Ataque por orientação sexual. Mascarar NÃO resolve — a função marca a faixa
 * para decisão humana em vez de fingir que sanitizou.
 */
const ATAQUES = ["cearagay", "ceara gay", "ceará gay", "cearagai"];

function normalizar(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** "caralho" → "c*****o": mantém primeira e última, mascara o miolo. */
function mascara(palavra: string): string {
  if (palavra.length <= 2) return "*".repeat(palavra.length);
  return palavra[0] + "*".repeat(palavra.length - 2) + palavra[palavra.length - 1];
}

export interface ResultadoDaMascara {
  texto: string;
  palavroesMascarados: string[];
  /** Termos de ataque encontrados — exigem decisão editorial, não máscara. */
  ataquesEncontrados: string[];
}

export function tratarLetra(letra: string): ResultadoDaMascara {
  const palavroesMascarados: string[] = [];
  const ataquesEncontrados: string[] = [];

  const alvo = normalizar(letra);
  for (const termo of ATAQUES) {
    if (alvo.includes(normalizar(termo))) ataquesEncontrados.push(termo);
  }

  let texto = letra;
  for (const termo of PALAVROES) {
    // \b não funciona com acento em todos os motores; a borda é feita à mão.
    const re = new RegExp(`(^|[^\\p{L}])(${termo})([^\\p{L}]|$)`, "giu");
    texto = texto.replace(re, (_m, antes, palavra: string, depois) => {
      palavroesMascarados.push(palavra.toLowerCase());
      return `${antes}${mascara(palavra)}${depois}`;
    });
  }

  return { texto, palavroesMascarados, ataquesEncontrados };
}

/** Normaliza a indentação que vem de template literal no arquivo de dados. */
export function limparIndentacao(letra: string): string {
  return letra
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}
