export interface ArticleCard {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl: string | null;
  category: string | null;
  sourceName: string;
  publishedAt: Date;
}

export interface ArticleDetail extends ArticleCard {
  originalUrl: string;
  sourceSlug: string;
  /** Texto próprio em parágrafos separados por linha em branco; nulo no legado. */
  content: string | null;
  related: ArticleCard[];
}

export interface NewsFilters {
  categories: string[];
  sources: { slug: string; name: string }[];
}
