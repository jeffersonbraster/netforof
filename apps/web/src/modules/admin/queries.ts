import { and, articles, count, desc, eq, ilike, isNotNull, or, sources, sql } from "@netfor/db";
import type { SQL } from "@netfor/db";

import { db } from "@/lib/db";

/**
 * Consultas do painel. Nenhuma é cacheada de propósito: quem edita precisa ver o
 * estado real do banco, não uma versão de minutos atrás.
 */

export const ESTADOS = ["review", "published", "draft", "hidden"] as const;
export type Estado = (typeof ESTADOS)[number];

export const ROTULO_ESTADO: Record<Estado, string> = {
  review: "Aguardando revisão",
  published: "No ar",
  draft: "Sem texto próprio",
  hidden: "Fora do ar",
};

export interface MateriaResumo {
  id: number;
  titulo: string;
  resumo: string;
  slug: string;
  imagemUrl: string | null;
  categoria: string | null;
  estado: Estado;
  veiculo: string;
  urlOriginal: string;
  publicadaEm: Date;
  reescritaEm: Date | null;
  temTextoProprio: boolean;
  tamanhoTexto: number;
}

export interface MateriaCompleta extends MateriaResumo {
  conteudo: string;
  modelo: string | null;
}

const POR_PAGINA = 20;

export async function listarMaterias(opcoes: {
  estado: Estado;
  busca?: string | null;
  pagina?: number;
}): Promise<{ itens: MateriaResumo[]; total: number; paginas: number; pagina: number }> {
  const pagina = Math.max(1, opcoes.pagina ?? 1);
  const busca = opcoes.busca?.trim();

  const condicoes: SQL[] = [eq(articles.status, opcoes.estado)];
  if (busca) {
    const alvo = `%${busca}%`;
    const filtro = or(ilike(articles.title, alvo), ilike(articles.excerpt, alvo));
    if (filtro) condicoes.push(filtro);
  }
  const onde = and(...condicoes);

  const [linhas, [totalRow]] = await Promise.all([
    db
      .select({
        id: articles.id,
        titulo: articles.title,
        resumo: articles.excerpt,
        slug: articles.slug,
        imagemUrl: articles.imageUrl,
        categoria: articles.category,
        estado: articles.status,
        veiculo: sources.name,
        urlOriginal: articles.originalUrl,
        publicadaEm: articles.publishedAt,
        reescritaEm: articles.rewrittenAt,
        temTextoProprio: isNotNull(articles.content),
        tamanhoTexto: sql<number>`coalesce(length(${articles.content}), 0)::int`,
      })
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(onde)
      .orderBy(desc(articles.publishedAt))
      .limit(POR_PAGINA)
      .offset((pagina - 1) * POR_PAGINA),
    db
      .select({ value: count() })
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(onde),
  ]);

  const total = totalRow?.value ?? 0;
  return {
    itens: linhas as MateriaResumo[],
    total,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    pagina,
  };
}

export async function buscarMateria(id: number): Promise<MateriaCompleta | null> {
  const [linha] = await db
    .select({
      id: articles.id,
      titulo: articles.title,
      resumo: articles.excerpt,
      conteudo: articles.content,
      slug: articles.slug,
      imagemUrl: articles.imageUrl,
      categoria: articles.category,
      estado: articles.status,
      veiculo: sources.name,
      urlOriginal: articles.originalUrl,
      publicadaEm: articles.publishedAt,
      reescritaEm: articles.rewrittenAt,
      modelo: articles.rewriteModel,
      tamanhoTexto: sql<number>`coalesce(length(${articles.content}), 0)::int`,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(eq(articles.id, id))
    .limit(1);

  if (!linha) return null;
  return {
    ...linha,
    conteudo: linha.conteudo ?? "",
    temTextoProprio: linha.conteudo !== null,
  } as MateriaCompleta;
}

export type Contagens = Record<Estado, number>;

export async function contarPorEstado(): Promise<Contagens> {
  const linhas = await db
    .select({ estado: articles.status, total: sql<number>`count(*)::int` })
    .from(articles)
    .groupBy(articles.status);

  const base: Contagens = { review: 0, published: 0, draft: 0, hidden: 0 };
  for (const l of linhas) base[l.estado] = l.total;
  return base;
}
