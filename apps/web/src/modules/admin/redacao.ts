import { articles, eq, sources } from "@netfor/db";

import { db } from "@/lib/db";

/**
 * Matéria de autoria própria — atualizações do portal, tutoriais, análises.
 *
 * Reaproveita a mesma tabela das demais em vez de criar outra: é o mesmo objeto
 * editorial, muda só a origem. Duplicar a tabela duplicaria listagem, cache,
 * sitemap e feed sem ganho nenhum.
 */

export const SLUG_REDACAO = "netfor";

/** Cria a "fonte" da casa na primeira vez que alguém escreve. */
export async function idDaRedacao(): Promise<number> {
  const [existente] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.slug, SLUG_REDACAO))
    .limit(1);
  if (existente) return existente.id;

  const [criada] = await db
    .insert(sources)
    .values({
      name: "NETFOR",
      slug: SLUG_REDACAO,
      baseUrl: "https://netfor.com.br",
      // Não entra nos filtros de fonte da listagem pública: não é veículo agregado.
      active: false,
    })
    .returning({ id: sources.id });

  if (!criada) throw new Error("não consegui criar a fonte da redação");
  return criada.id;
}

export function gerarSlug(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

async function slugLivre(base: string): Promise<string> {
  let candidato = base || "materia";
  for (let i = 2; i < 60; i++) {
    const [existe] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, candidato))
      .limit(1);
    if (!existe) return candidato;
    candidato = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

async function hash(texto: string): Promise<string> {
  const dados = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest("SHA-256", dados);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface NovaMateria {
  titulo: string;
  resumo: string;
  conteudo: string;
  categoria: string | null;
  imagemUrl: string | null;
  publicar: boolean;
}

export async function criarMateriaPropria(dados: NovaMateria): Promise<number> {
  const sourceId = await idDaRedacao();
  const slug = await slugLivre(gerarSlug(dados.titulo));

  const [criada] = await db
    .insert(articles)
    .values({
      sourceId,
      title: dados.titulo.slice(0, 200),
      slug,
      excerpt: dados.resumo.slice(0, 400),
      content: dados.conteudo,
      // A tabela exige URL única. Para matéria da casa, a canônica é a própria
      // página — o que mantém a restrição válida sem inventar link externo.
      originalUrl: `https://netfor.com.br/noticias/${slug}`,
      imageUrl: dados.imagemUrl,
      category: dados.categoria,
      publishedAt: new Date(),
      contentHash: await hash(`netfor:${slug}`),
      status: dados.publicar ? "published" : "review",
    })
    .returning({ id: articles.id });

  if (!criada) throw new Error("não consegui criar a matéria");
  return criada.id;
}
