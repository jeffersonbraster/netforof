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
  fetchLatest(): Promise<RawArticle[]>;
}

export interface SourceRunSummary {
  source: string;
  fetched: number;
  inserted: number;
  duplicates: number;
  error: string | null;
}
