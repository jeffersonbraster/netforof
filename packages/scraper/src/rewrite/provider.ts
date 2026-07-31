/**
 * Contrato do provedor de reescrita.
 *
 * Existe para o provedor ser trocável sem tocar no pipeline: quem chama conhece
 * só esta interface. Trocar OpenAI por outro fornecedor é escrever um arquivo
 * novo aqui do lado e mudar uma variável de ambiente.
 */

export interface PedidoDeReescrita {
  /** Título original — serve de contexto, não deve ser copiado. */
  tituloOriginal: string;
  /** Texto integral da fonte. Insumo; nunca é publicado nem gravado. */
  textoOriginal: string;
  /** Nome do veículo, para o modelo saber quem apurou. */
  veiculo: string;
  /** Reforço na 2ª tentativa, quando a trava de originalidade reprovou a 1ª. */
  reforco?: string;
}

export interface MateriaReescrita {
  /** Título próprio, diferente do original. */
  titulo: string;
  /** Linha fina / resumo próprio — vira o `excerpt`. */
  resumo: string;
  /** Corpo em parágrafos. Cada item é um parágrafo. */
  paragrafos: string[];
}

export interface ProvedorDeReescrita {
  readonly nome: string;
  readonly modelo: string;
  reescrever(pedido: PedidoDeReescrita): Promise<MateriaReescrita>;
}

/**
 * Instrução do sistema. É aqui que a postura jurídica e editorial do portal é
 * decidida na prática, então cada regra tem motivo:
 *
 * - Fato apurado não é protegido por direito autoral; a redação específica é.
 *   Daí a proibição de reaproveitar frases.
 * - Declaração entre aspas é fato verificável e a citação curta com atribuição é
 *   permitida — mas atribuída a QUEM FALOU, não ao veículo.
 * - Proibir inferência é a regra mais importante. Fato inventado sobre jogador
 *   ou clube é risco de difamação, muito pior que qualquer questão autoral.
 */
export const INSTRUCAO_SISTEMA = `Você é redator de um portal brasileiro de notícias sobre futebol.

Recebe o texto de uma matéria publicada por outro veículo e escreve uma NOVA matéria
sobre o mesmo fato, com redação inteiramente própria.

REGRAS INEGOCIÁVEIS:
1. Não reaproveite frases, construções ou a sequência de parágrafos do original.
   Escreva do zero a partir dos fatos.
2. Não invente NADA. Nenhum número, data, valor, placar, nome, cargo ou declaração
   que não esteja no texto recebido. Se um dado não está lá, ele não existe.
3. Declarações entre aspas podem ser mantidas na íntegra, sempre atribuídas a quem
   falou ("disse o técnico", "afirmou o zagueiro"). Nunca atribua ao veículo.
4. Não opine, não torça, não adjetive além do que o fato sustenta. Registro
   informativo e sóbrio.
5. Não cite o nome do veículo de origem no texto — o crédito aparece na página.

FORMATO: 4 a 7 parágrafos, 90 a 180 palavras cada no máximo, português do Brasil.
O primeiro parágrafo responde o que aconteceu. Sem subtítulos, sem listas, sem
markdown.

Responda SOMENTE com JSON válido:
{"titulo":"...","resumo":"...","paragrafos":["...","..."]}

O título deve ser próprio e diferente do original, factual, sem sensacionalismo,
no máximo 100 caracteres. O resumo tem 1 frase de até 200 caracteres.`;
