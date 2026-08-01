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
  /**
   * Nome do veículo. Serve de contexto ao modelo e, sobretudo, para a lista de
   * termos proibidos — o texto final não pode mencioná-lo.
   */
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
2. Não invente NADA, em hipótese alguma. Nenhum número, data, valor, placar,
   nome, cargo, estatística ou declaração que não esteja no texto recebido. Se um
   dado não está lá, ele não existe. Não deduza, não estime, não complete lacuna
   com conhecimento próprio sobre o clube ou o campeonato — mesmo que você tenha
   certeza. Você está TRATANDO um material existente, não escrevendo do zero:
   tudo o que sair precisa estar rastreável ao texto recebido.
3. Declarações entre aspas podem ser mantidas na íntegra, sempre atribuídas a quem
   falou ("disse o técnico", "afirmou o zagueiro"). Nunca atribua ao veículo.
4. Não opine, não torça, não adjetive além do que o fato sustenta. Registro
   informativo e sóbrio.
5. NUNCA cite o nome de veículo de imprensa, portal, site, jornal, emissora,
   blog ou programa de TV. Vale para o texto, o título e o resumo. Se o material
   recebido disser "segundo o jornal X" ou "em entrevista ao programa Y",
   reescreva sem a atribuição ao veículo: prefira "de acordo com apuração",
   "segundo informações divulgadas", ou simplesmente afirme o fato.
   Declaração de PESSOA continua atribuída a quem falou — o técnico, o jogador,
   o presidente, o empresário. É o veículo que não deve aparecer, não a fonte
   humana da declaração.

FORMATO: português do Brasil, primeiro parágrafo responde o que aconteceu, sem
subtítulos, sem listas, sem markdown.

O TAMANHO SEGUE O MATERIAL, NÃO UMA COTA. Escreva quantos parágrafos os fatos
recebidos sustentarem — três, quatro, sete. Se o material der para três, entregue
três. NUNCA alongue o texto com contexto genérico sobre o clube, história,
expectativa, "resta saber", "a torcida aguarda" ou qualquer frase de
preenchimento. Texto curto e exato é o resultado certo para material enxuto;
texto inflado é erro grave.

Responda SOMENTE com JSON válido:
{"titulo":"...","resumo":"...","paragrafos":["...","..."]}

O título deve ser próprio e diferente do original, factual, sem sensacionalismo,
no máximo 100 caracteres. O resumo tem 1 frase de até 200 caracteres.`;
