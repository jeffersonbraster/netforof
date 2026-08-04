export interface RawArticle {
  title: string;
  originalUrl: string;
  excerpt: string | null;
  imageUrl: string | null;
  category: string | null;
  publishedAt: Date | null;
}

export interface NewsSource {
  /** Deve bater com sources.slug no banco */
  slug: string;
  name: string;
  baseUrl: string;
  /**
   * Portal que cobre futebol em geral, não só o Fortaleza, e por isso aplica o
   * filtro de pertinência antes de devolver os itens.
   *
   * Numa fonte dessas, zero item é o resultado ESPERADO na maior parte dos dias
   * — o feed veio inteiro e nenhuma matéria era do clube. Sem esta marca o
   * pipeline avisava "verificar se o portal mudou" toda execução, confundindo
   * ausência de assunto com adapter quebrado.
   */
  generalista?: boolean;
  fetchLatest(): Promise<RawArticle[]>;
}

export interface SourceRunSummary {
  source: string;
  fetched: number;
  inserted: number;
  duplicates: number;
  error: string | null;
}
