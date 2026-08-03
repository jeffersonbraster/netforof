"use server";

import { and, chants, count, eq, ne } from "@netfor/db";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSessao } from "@/lib/admin-auth";
import { db } from "@/lib/db";

/**
 * Cantos da torcida pelo painel.
 *
 * Até aqui a única forma de mexer nas letras era rodar o seed — o que significa
 * abrir o editor, escrever SQL e fazer deploy para corrigir uma palavra. Isso
 * agora é trabalho de operação, não de desenvolvimento.
 *
 * Como toda ação do painel, cada uma revalida a sessão por conta própria: o gate
 * da página protege a navegação, não a Server Action, que é um endpoint e pode
 * ser chamada direto.
 */

/** A lista pública vive em `cacheLife("days")` — sem isto a edição só apareceria amanhã. */
function revalidar() {
  revalidateTag("chants", "max");
}

/**
 * Endereço da página a partir do título.
 *
 * `NFD` + corte dos diacríticos resolve o caso real do acervo: "Vamos, Leão!"
 * viraria "vamos-leo" com um `replace` ingênuo, porque o `ã` não sobrevive ao
 * filtro de `a-z`. Normalizando antes, vira "vamos-leao".
 */
function gerarSlug(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Garante slug único.
 *
 * `chants.slug` tem índice único e é o que a URL pública usa. Dois cantos com
 * títulos parecidos ("Fortaleza, meu amor" em duas versões) colidiriam, e o
 * insert estouraria com erro de banco na cara do operador. Sufixo numérico
 * resolve em silêncio, que é o comportamento certo aqui.
 */
async function slugLivre(base: string, ignorarId?: number): Promise<string> {
  const raiz = base || "canto";
  for (let tentativa = 0; ; tentativa++) {
    const candidato = tentativa === 0 ? raiz : `${raiz}-${tentativa + 1}`;
    const [linha] = await db
      .select({ total: count() })
      .from(chants)
      .where(
        ignorarId === undefined
          ? eq(chants.slug, candidato)
          : and(eq(chants.slug, candidato), ne(chants.id, ignorarId)),
      );
    if ((linha?.total ?? 0) === 0) return candidato;
  }
}

/**
 * Aceita URL inteira do YouTube ou o ID solto.
 *
 * O operador copia o endereço da barra do navegador — é o gesto natural. Exigir
 * que ele extraia o ID à mão seria transferir para a pessoa um trabalho que o
 * código faz em três linhas, e a primeira letra errada quebraria o player sem
 * mensagem nenhuma.
 */
function extrairVideoId(bruto: string): string | null {
  const texto = bruto.trim();
  if (!texto) return null;
  const padroes = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/,
  ];
  for (const padrao of padroes) {
    const achou = texto.match(padrao);
    if (achou) return achou[1];
  }
  return /^[A-Za-z0-9_-]{11}$/.test(texto) ? texto : null;
}

interface Campos {
  titulo: string;
  letra: string;
  categoria: "hino" | "canto";
  videoId: string | null;
  imagemUrl: string | null;
  ordem: number;
}

/** Devolve `null` quando falta o essencial — título e letra. */
function lerCampos(dados: FormData): Campos | null {
  const titulo = String(dados.get("titulo") ?? "").trim();
  // `\r\n` vira `\n`: o textarea do navegador manda CRLF, e o `<pre>` da página
  // pública renderiza o `\r` como um caractere fantasma no fim de cada verso.
  const letra = String(dados.get("letra") ?? "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (!titulo || !letra) return null;

  const ordemBruta = Number.parseInt(String(dados.get("ordem") ?? "0"), 10);

  return {
    titulo: titulo.slice(0, 120),
    letra,
    categoria: dados.get("categoria") === "hino" ? "hino" : "canto",
    videoId: extrairVideoId(String(dados.get("video") ?? "")),
    imagemUrl: String(dados.get("imagemUrl") ?? "").trim() || null,
    ordem: Number.isInteger(ordemBruta) ? Math.max(0, Math.min(999, ordemBruta)) : 0,
  };
}

export async function criarCanto(dados: FormData): Promise<void> {
  await exigirSessao();

  const campos = lerCampos(dados);
  if (!campos) redirect("/admin/cantos/novo?erro=1");

  const [criado] = await db
    .insert(chants)
    .values({
      title: campos.titulo,
      slug: await slugLivre(gerarSlug(campos.titulo)),
      lyrics: campos.letra,
      category: campos.categoria,
      videoId: campos.videoId,
      imageUrl: campos.imagemUrl,
      order: campos.ordem,
    })
    .returning({ id: chants.id });

  revalidar();
  redirect(criado ? `/admin/cantos/${criado.id}?salvo=1` : "/admin/cantos");
}

export async function salvarCanto(dados: FormData): Promise<void> {
  await exigirSessao();

  const id = Number(dados.get("id"));
  if (!Number.isInteger(id)) redirect("/admin/cantos");

  const campos = lerCampos(dados);
  if (!campos) redirect(`/admin/cantos/${id}?erro=1`);

  /**
   * O slug NÃO é regerado a partir do novo título de propósito.
   *
   * O endereço já pode estar em link compartilhado e indexado no Google; trocá-lo
   * porque o operador corrigiu um acento quebraria essas entradas em silêncio.
   * Renomear é uma decisão explícita — daí o campo próprio.
   */
  const slugPedido = String(dados.get("slug") ?? "").trim();
  const slug = slugPedido ? await slugLivre(gerarSlug(slugPedido), id) : undefined;

  await db
    .update(chants)
    .set({
      title: campos.titulo,
      lyrics: campos.letra,
      category: campos.categoria,
      videoId: campos.videoId,
      imageUrl: campos.imagemUrl,
      order: campos.ordem,
      ...(slug ? { slug } : {}),
    })
    .where(eq(chants.id, id));

  revalidar();
  redirect(`/admin/cantos/${id}?salvo=1`);
}

/**
 * Remove de vez.
 *
 * Aqui apagar é seguro, ao contrário das matérias: canto não é recoletado por
 * scraper nenhum, então a linha não volta sozinha. O conteúdo é digitado à mão,
 * e o operador é dono dele.
 */
export async function removerCanto(id: number): Promise<void> {
  await exigirSessao();
  if (!Number.isInteger(id)) redirect("/admin/cantos");

  await db.delete(chants).where(eq(chants.id, id));
  revalidar();
  redirect("/admin/cantos?removido=1");
}
