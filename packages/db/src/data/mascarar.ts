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
 * Ataque por orientação sexual.
 *
 * Tratamento: descartar o VERSO inteiro, não a palavra.
 *
 * Máscara e remoção por token foram testadas e falham. "Cearagay" mascarado vira
 * `C*******y`, legível. Removido, sobra "A é gay, é gay!" — o ataque continua
 * inteiro, agora sem nem o alvo nomeado. E quando o termo está no meio da frase,
 * o verso vira fragmento sem sentido.
 *
 * A unidade que carrega o ataque é a frase, então é a frase que sai. O áudio do
 * vídeo é conteúdo do YouTube; o que responde por nós é a letra escrita.
 */
const ATAQUES = ["cearagay", "ceara gay", "ceará gay", "cearagai", "ceara gai"];

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
  /** Termos de ataque removidos do texto publicado. */
  ataquesRemovidos: string[];
  /** Versos inteiros descartados por conterem o ataque. */
  versosDescartados: number;
}

/**
 * Descarta o verso inteiro que contém o termo. Ver a nota em ATAQUES sobre por
 * que remoção por palavra não serve.
 */
function descartarVersos(texto: string, termos: string[]): { texto: string; descartados: number } {
  let descartados = 0;

  const mantidas = texto.split("\n").filter((linha) => {
    const alvo = normalizar(linha);
    const contem = termos.some((termo) => alvo.includes(normalizar(termo)));
    if (contem) descartados++;
    return !contem;
  });

  return { texto: mantidas.join("\n"), descartados };
}

export function tratarLetra(letra: string): ResultadoDaMascara {
  const palavroesMascarados: string[] = [];
  const ataquesRemovidos: string[] = [];

  const alvo = normalizar(letra);
  for (const termo of ATAQUES) {
    if (alvo.includes(normalizar(termo))) ataquesRemovidos.push(termo);
  }

  const semAtaques =
    ataquesRemovidos.length > 0 ? descartarVersos(letra, ATAQUES) : { texto: letra, descartados: 0 };

  let texto = semAtaques.texto;
  for (const termo of PALAVROES) {
    // \b não funciona com acento em todos os motores; a borda é feita à mão.
    const re = new RegExp(`(^|[^\\p{L}])(${termo})([^\\p{L}]|$)`, "giu");
    texto = texto.replace(re, (_m, antes, palavra: string, depois) => {
      palavroesMascarados.push(palavra.toLowerCase());
      return `${antes}${mascara(palavra)}${depois}`;
    });
  }

  return {
    texto,
    palavroesMascarados,
    ataquesRemovidos,
    versosDescartados: semAtaques.descartados,
  };
}

/** Normaliza a indentação que vem de template literal no arquivo de dados. */
export function limparIndentacao(letra: string): string {
  return letra
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}
