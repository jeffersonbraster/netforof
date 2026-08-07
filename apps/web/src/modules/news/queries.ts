import { and, count, desc, eq, gte, isNotNull, ne, sql } from "@netfor/db";
import { cacheLife, cacheTag } from "next/cache";

import { articles, articleViews, destaqueLayout, sources, type DestaqueLayout } from "@netfor/db";

import { db } from "@/lib/db";
import type { ArticleCard, ArticleDetail, NewsFilters } from "./types";

const cardColumns = {
  id: articles.id,
  title: articles.title,
  slug: articles.slug,
  excerpt: articles.excerpt,
  imageUrl: articles.imageUrl,
  category: articles.category,
  sourceName: sources.name,
  publishedAt: articles.publishedAt,
};

/**
 * Dedupe de exibição (nível 2 do plano): mantém só a matéria mais recente de
 * cada contentHash — a cobertura repetida vira "cobertura relacionada".
 */
function dedupeByHash<T extends { id: number }>(rows: (T & { contentHash: string })[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const row of rows) {
    if (seen.has(row.contentHash)) continue;
    seen.add(row.contentHash);
    result.push(row);
  }
  return result;
}

/**
 * Composição da área de destaque da home.
 *
 * `destaques` vem na ordem de exibição e tem exatamente o número de slots que o
 * modo pede — a página não precisa saber contar. `latest` nunca repete o que já
 * está no destaque.
 */
export interface DestaqueDaHome {
  destaques: ArticleCard[];
  latest: ArticleCard[];
}

/**
 * Monta o destaque respeitando a curadoria do painel.
 *
 * ---------------------------------------------------------------------------
 * TRÊS NÍVEIS, DO MAIS EXPLÍCITO AO AUTOMÁTICO
 * ---------------------------------------------------------------------------
 * 1. **Fixada em slot exato (1, 2 ou 3).** Ocupa aquela posição e ponto. Fixar
 *    em 2 e a matéria aparecer em 1 "porque havia espaço" seria pior que não ter
 *    fixação nenhuma.
 * 2. **Estrelada.** Entra nos slots que sobraram, da mais recente para a mais
 *    antiga. É a curadoria do dia a dia: o editor marca o que merece destaque
 *    sem precisar decidir a ordem exata.
 * 3. **Recência.** Preenche o que ainda faltar. É o comportamento de sempre, e
 *    continua sendo o que acontece quando ninguém marcou nada.
 *
 * Sem os dois primeiros níveis o destaque é só "as mais novas", que quase nunca
 * é o que a capa deveria mostrar — foi exatamente essa a queixa que originou a
 * estrela.
 *
 * ---------------------------------------------------------------------------
 * A PREFERÊNCIA POR IMAGEM SÓ VALE NO AUTOMÁTICO
 * ---------------------------------------------------------------------------
 * Sem curadoria, o slot 1 escolhe a matéria mais recente COM foto, porque
 * manchete sem imagem deixa um buraco na página. Mas fixação e estrela são
 * decisão humana: se o editor marcou algo sem foto para a manchete, a escolha é
 * dele. Sobrepor a preferência automática ali seria o sistema discordando do
 * operador em silêncio.
 *
 * ---------------------------------------------------------------------------
 * NADA É DESCARTADO AO TROCAR DE MODO
 * ---------------------------------------------------------------------------
 * Com o modo `uma`, uma matéria fixada em 3 fica fora do destaque e volta para a
 * lista de últimas — mas o pino continua gravado. Trocar o modo de volta a traz
 * de volta sem refazer nada.
 */
function comporDestaque(
  candidatos: (ArticleCard & { pinnedPosition: number | null; estrelada: boolean })[],
  slots: number,
): DestaqueDaHome {
  const fixadas = new Map<number, ArticleCard>();
  for (const artigo of candidatos) {
    const posicao = artigo.pinnedPosition;
    if (posicao !== null && posicao >= 1 && posicao <= slots && !fixadas.has(posicao)) {
      fixadas.set(posicao, artigo);
    }
  }

  const usados = new Set([...fixadas.values()].map((a) => a.id));
  const sobraram = candidatos.filter((a) => !usados.has(a.id));

  // Estreladas primeiro, cada grupo já em ordem de recência (a consulta ordena).
  const estreladas = sobraram.filter((a) => a.estrelada);
  const automaticas = sobraram.filter((a) => !a.estrelada);
  const livres = [...estreladas, ...automaticas];
  const houveCuradoria = estreladas.length > 0;

  const destaques: ArticleCard[] = [];
  for (let slot = 1; slot <= slots; slot++) {
    const fixada = fixadas.get(slot);
    if (fixada) {
      destaques.push(fixada);
      continue;
    }

    const indice =
      slot === 1 && !houveCuradoria
        ? Math.max(
            0,
            livres.findIndex((a) => a.imageUrl !== null),
          )
        : 0;

    const escolhida = livres[indice];
    if (!escolhida) break;
    destaques.push(escolhida);
    livres.splice(indice, 1);
  }

  return { destaques, latest: livres.slice(0, 8) };
}

/**
 * Modo de destaque escolhido no painel.
 *
 * Tag PRÓPRIA (`config`), separada de `articles`: trocar o modo não deveria
 * derrubar do cache tudo que depende de matéria, e publicar matéria não deveria
 * reler configuração. São dois eventos com frequências muito diferentes — o modo
 * muda algumas vezes por mês, matéria muda a cada hora.
 */
export async function getDestaqueLayout(): Promise<DestaqueLayout> {
  "use cache";
  cacheTag("config");
  cacheLife("days");

  return destaqueLayout(db);
}

export async function getHomeArticles(slots: number): Promise<DestaqueDaHome> {
  "use cache";
  cacheTag("articles");
  cacheLife("days");

  const rows = await db
    .select({
      ...cardColumns,
      pinnedPosition: articles.pinnedPosition,
      estrelada: articles.isHighlighted,
      contentHash: articles.contentHash,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
    .limit(60);

  return comporDestaque(dedupeByHash(rows), slots);
}

export interface ArticlesPageParams {
  page: number;
  category: string | null;
  sourceSlug: string | null;
}

export async function getArticlesPage({ page, category, sourceSlug }: ArticlesPageParams): Promise<{
  items: ArticleCard[];
  total: number;
  pageSize: number;
}> {
  "use cache";
  cacheTag("articles");
  cacheLife("days");

  const pageSize = 12;
  const conditions = [eq(articles.status, "published")];
  if (category) conditions.push(eq(articles.category, category));
  if (sourceSlug) conditions.push(eq(sources.slug, sourceSlug));
  const where = and(...conditions);

  const [items, [totalRow]] = await Promise.all([
    db
      .select(cardColumns)
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(where)
      .orderBy(desc(articles.publishedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(where),
  ]);

  return { items, total: totalRow?.value ?? 0, pageSize };
}

export async function getNewsFilters(): Promise<NewsFilters> {
  "use cache";
  cacheTag("articles");
  cacheLife("days");

  const [categoryRows, sourceRows] = await Promise.all([
    db
      .selectDistinct({ category: articles.category })
      .from(articles)
      .where(and(eq(articles.status, "published"), isNotNull(articles.category))),
    db
      .select({ slug: sources.slug, name: sources.name })
      .from(sources)
      .where(eq(sources.active, true))
      .orderBy(sources.name),
  ]);

  return {
    categories: categoryRows
      .map((row) => row.category)
      .filter((c): c is string => c !== null)
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
    sources: sourceRows,
  };
}

/**
 * Slugs publicados, numa única entrada de cache. Serve de porteiro para
 * `getArticleBySlug`: o argumento dela entra na chave do cache, então cada slug
 * inexistente que um crawler inventa viraria uma entrada nova no KV — espaço de
 * chave infinito, com o agravante de que o `null` do resultado também é
 * cacheado. Conferindo aqui primeiro, URL inválida vira 404 sem escrever nada.
 */
export async function getPublishedSlugs(): Promise<string[]> {
  "use cache";
  cacheTag("articles");
  cacheLife("days");

  const rows = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(eq(articles.status, "published"));

  return rows.map((row) => row.slug);
}

/**
 * Porteiro de `getArticleDetail`: confere o slug contra a lista publicada antes
 * de deixar o argumento virar chave de cache. Sem isso, `/noticias/qualquer-lixo`
 * cria entrada nova no KV a cada URL inventada.
 */
export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const publicados = await getPublishedSlugs();
  if (!publicados.includes(slug)) return null;
  return getArticleDetail(slug);
}

/**
 * Só a tag do próprio slug — nada de `articles`. A matéria é imutável depois de
 * inserida (o pipeline usa onConflictDoNothing), então incluí-la na tag de lista
 * fazia cada notícia nova invalidar todas as páginas de matéria de uma vez: era
 * o maior multiplicador de escrita no KV. O que envelhece aqui é só o bloco de
 * cobertura relacionada, e para isso o próprio cacheLife basta.
 *
 * Já vem com o slug validado por `getArticleBySlug`. Chamar direto (sem passar
 * pelo porteiro) é proposital em escopo cacheado: `getPublishedSlugs` carrega a
 * tag `articles`, que vazaria para a entrada externa e desfaria tudo isto.
 *
 * 30 dias (perfil `materia`) em vez de "days": o conteúdo não muda depois de
 * aprovado, e quem edita pelo painel revalida `article-<slug>` na hora. O bloco
 * de recirculação, que É atualizado, foi tirado daqui de propósito — ver
 * `getRecirculacao`.
 */
export async function getArticleDetail(slug: string): Promise<ArticleDetail | null> {
  "use cache";
  cacheTag(`article-${slug}`);
  cacheLife("materia");

  const [row] = await db
    .select({
      ...cardColumns,
      originalUrl: articles.originalUrl,
      sourceSlug: sources.slug,
      content: articles.content,
      contentHash: articles.contentHash,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(and(eq(articles.slug, slug), eq(articles.status, "published")))
    .limit(1);

  if (!row) return null;

  const related = await db
    .select(cardColumns)
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(
      and(
        eq(articles.contentHash, row.contentHash),
        ne(articles.id, row.id),
        eq(articles.status, "published"),
      ),
    )
    .orderBy(desc(articles.publishedAt))
    .limit(5);

  // contentHash é detalhe interno de deduplicação — não vaza para a UI.
  const { contentHash, ...article } = row;
  void contentHash;
  return { ...article, related };
}

/**
 * Destaques do dia — o que está movimentando o portal nas últimas 24 horas.
 *
 * Janela MÓVEL de 24h, não data de calendário: publicação por data zeraria a
 * seção toda madrugada (agora mesmo há 0 matérias "de hoje" e 14 nas últimas
 * 24h). Ordena por leituras da janela e cai para recência quando ninguém leu
 * ainda — seção vazia é pior que seção por ordem cronológica.
 */
export async function getDestaquesDoDia(limite = 4): Promise<ArticleCard[]> {
  "use cache";
  cacheTag("articles");
  cacheLife("hours");

  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const diaInicial = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const rows = await db
    .select({
      ...cardColumns,
      contentHash: articles.contentHash,
      leituras: sql<number>`coalesce(sum(${articleViews.count}), 0)::int`,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .leftJoin(
      articleViews,
      and(eq(articleViews.articleId, articles.id), gte(articleViews.day, diaInicial)),
    )
    .where(
      and(
        eq(articles.status, "published"),
        isNotNull(articles.content),
        gte(articles.publishedAt, desde),
      ),
    )
    .groupBy(articles.id, sources.name)
    .orderBy(desc(sql`coalesce(sum(${articleViews.count}), 0)`), desc(articles.publishedAt))
    .limit(limite * 3);

  return dedupeByHash(rows).slice(0, limite);
}

/**
 * Recirculação no fim da matéria.
 *
 * Mistura deliberada: primeiro as da MESMA categoria (quem leu sobre mercado
 * quer mais mercado), completando com as mais recentes. Só categoria produz
 * fundo de poço em categoria pequena; só recência ignora o interesse demonstrado.
 *
 * É a ÚNICA parte da página de matéria que continua se atualizando, e por isso
 * precisa ser renderizada fora do escopo cacheado do corpo da matéria. A regra
 * do Next: quando um `use cache` com `cacheLife` explícito envolve outro, o de
 * fora vence e congela o de dentro junto — chamada aqui de dentro do corpo, a
 * recirculação ficaria presa nos mesmos 30 dias. Ver o `<Suspense>` irmão em
 * `app/noticias/[slug]/page.tsx`.
 */
export async function getRecirculacao(
  slugAtual: string,
  categoria: string | null,
  limite = 4,
): Promise<ArticleCard[]> {
  "use cache";
  cacheTag("articles");
  cacheLife("days");

  const base = and(
    eq(articles.status, "published"),
    isNotNull(articles.content),
    ne(articles.slug, slugAtual),
  );

  const mesmaCategoria = categoria
    ? await db
        .select({ ...cardColumns, contentHash: articles.contentHash })
        .from(articles)
        .innerJoin(sources, eq(articles.sourceId, sources.id))
        .where(and(base, eq(articles.category, categoria)))
        .orderBy(desc(articles.publishedAt))
        .limit(limite)
    : [];

  const recentes = await db
    .select({ ...cardColumns, contentHash: articles.contentHash })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(base)
    .orderBy(desc(articles.publishedAt))
    .limit(limite * 3);

  const vistos = new Set<number>();
  const saida: typeof recentes = [];
  for (const item of [...mesmaCategoria, ...recentes]) {
    if (vistos.has(item.id)) continue;
    vistos.add(item.id);
    saida.push(item);
    if (saida.length >= limite) break;
  }
  return dedupeByHash(saida).slice(0, limite);
}

export interface MostReadItem {
  title: string;
  slug: string;
  views: number;
}

export async function getMostReadWeek(): Promise<MostReadItem[]> {
  "use cache";
  cacheTag("articles");
  cacheLife("days");

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceDay = since.toISOString().slice(0, 10);

  const rows = await db
    .select({
      title: articles.title,
      slug: articles.slug,
      views: sql<number>`sum(${articleViews.count})`.mapWith(Number),
    })
    .from(articleViews)
    .innerJoin(articles, eq(articleViews.articleId, articles.id))
    .where(and(gte(articleViews.day, sinceDay), eq(articles.status, "published")))
    .groupBy(articles.id, articles.title, articles.slug)
    .orderBy(desc(sql`sum(${articleViews.count})`))
    .limit(5);

  if (rows.length >= 5) return rows;

  // Fallback: completa com as mais recentes enquanto não há views suficientes
  const seen = new Set(rows.map((r) => r.slug));
  const recent = await db
    .select({ title: articles.title, slug: articles.slug })
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
    .limit(10);

  const fallback = recent
    .filter((r) => !seen.has(r.slug))
    .slice(0, 5 - rows.length)
    .map((r) => ({ ...r, views: 0 }));

  return [...rows, ...fallback];
}
