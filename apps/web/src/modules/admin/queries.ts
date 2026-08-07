import {
  and,
  articles,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  matches,
  or,
  sources,
  sql,
  type Match,
} from "@netfor/db";
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
  // `hidden` acumula o que foi descartado na revisão e o que saiu do ar. Nas
  // duas pontas é a mesma coisa para quem opera: a pilha do que não está no site
  // e pode voltar. "Lixeira" é o nome que o operador usa.
  hidden: "Lixeira",
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
  /** Slot fixado no destaque da home (1, 2 ou 3); nulo quando não fixada. */
  pino: number | null;
  /** Marcada com a estrela: entra no destaque antes das automáticas. */
  estrelada: boolean;
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
        pino: articles.pinnedPosition,
        estrelada: articles.isHighlighted,
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

/** Quanto tempo para trás a tela de jogos enxerga. */
const JANELA_DE_JOGOS_DIAS = 21;

export interface JogosDoPainel {
  /** Já começou e ainda não está encerrado — é aqui que o placar é digitado. */
  emCampo: Match[];
  proximos: Match[];
  encerrados: Match[];
}

/**
 * Jogos para o painel.
 *
 * NÃO usa `getAgenda`/`getRecentResults` de propósito, e o motivo é um bug real:
 * aquelas consultas cobrem `kickoff >= agora` (agenda) e `status = 'finished'`
 * (resultados). Um jogo que JÁ COMEÇOU e ainda não foi marcado como encerrado não
 * satisfaz nenhuma das duas e simplesmente sumia da tela — justamente na janela
 * em que o operador precisa digitar o placar à mão. Foi o que aconteceu em
 * 02/08/2026 com Palmeiras × Fortaleza.
 *
 * Aqui a janela é contínua: tudo dos últimos 21 dias em diante, sem filtro de
 * estado, separado em três grupos por tempo e não por `status`. Um jogo não tem
 * como cair fora dos três.
 *
 * Sem cache, como todas as consultas deste módulo: `getRecentResults` vive em
 * `cacheLife("days")`, e um painel que mostra o banco de ontem não serve para
 * corrigir placar.
 */
export async function listarJogosDoPainel(): Promise<JogosDoPainel> {
  const agora = new Date();
  const desde = new Date(agora.getTime() - JANELA_DE_JOGOS_DIAS * 24 * 60 * 60 * 1000);

  const linhas = await db
    .select()
    .from(matches)
    .where(gte(matches.kickoffAt, desde))
    .orderBy(asc(matches.kickoffAt));

  const emCampo: Match[] = [];
  const proximos: Match[] = [];
  const encerrados: Match[] = [];

  for (const jogo of linhas) {
    if (jogo.kickoffAt > agora) proximos.push(jogo);
    else if (jogo.status === "finished") encerrados.push(jogo);
    else emCampo.push(jogo);
  }

  // Encerrado é histórico: o mais recente primeiro é a ordem em que se confere.
  encerrados.reverse();
  return { emCampo, proximos, encerrados };
}
