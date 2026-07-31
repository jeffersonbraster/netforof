import { articles, desc, eq, sources, sql } from "@netfor/db";

import { db } from "@/lib/db";

/**
 * Consultas do painel. Nenhuma é cacheada de propósito: o revisor precisa ver o
 * estado real da fila, não uma versão de minutos atrás.
 */

export interface MateriaEmRevisao {
  id: number;
  titulo: string;
  resumo: string;
  conteudo: string;
  slug: string;
  imagemUrl: string | null;
  categoria: string | null;
  urlOriginal: string;
  veiculo: string;
  publicadaEm: Date;
  reescritaEm: Date | null;
  modelo: string | null;
}

export async function listarParaRevisao(): Promise<MateriaEmRevisao[]> {
  const linhas = await db
    .select({
      id: articles.id,
      titulo: articles.title,
      resumo: articles.excerpt,
      conteudo: articles.content,
      slug: articles.slug,
      imagemUrl: articles.imageUrl,
      categoria: articles.category,
      urlOriginal: articles.originalUrl,
      veiculo: sources.name,
      publicadaEm: articles.publishedAt,
      reescritaEm: articles.rewrittenAt,
      modelo: articles.rewriteModel,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(eq(articles.status, "review"))
    .orderBy(desc(articles.publishedAt));

  return linhas.map((l) => ({ ...l, conteudo: l.conteudo ?? "" }));
}

export interface ContagemPorEstado {
  draft: number;
  review: number;
  published: number;
  hidden: number;
}

export async function contarPorEstado(): Promise<ContagemPorEstado> {
  const linhas = await db
    .select({ estado: articles.status, total: sql<number>`count(*)::int` })
    .from(articles)
    .groupBy(articles.status);

  const base: ContagemPorEstado = { draft: 0, review: 0, published: 0, hidden: 0 };
  for (const l of linhas) base[l.estado] = l.total;
  return base;
}
