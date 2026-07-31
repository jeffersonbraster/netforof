"use server";

import { articles, eq } from "@netfor/db";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { criarSessao, encerrarSessao, exigirSessao, senhaCorreta } from "@/lib/admin-auth";
import { db } from "@/lib/db";

/**
 * Toda ação revalida a sessão por conta própria. O gate da página protege a
 * navegação, não a Server Action: ela é um endpoint e pode ser chamada direto.
 */

export async function entrar(_estadoAnterior: string | null, dados: FormData): Promise<string> {
  const senha = dados.get("senha");
  if (typeof senha !== "string" || !senhaCorreta(senha)) {
    // Mensagem genérica: não revela se a senha existe ou se está só errada.
    return "Senha inválida.";
  }
  await criarSessao();
  redirect("/admin");
}

export async function sair(): Promise<void> {
  await encerrarSessao();
  redirect("/admin/login");
}

/** Invalida as listas e a página da própria matéria. */
function revalidar(slug: string) {
  revalidateTag("articles", "max");
  if (slug) revalidateTag(`article-${slug}`, "max");
}

async function mudarEstado(dados: FormData, estado: "published" | "hidden" | "review") {
  await exigirSessao();
  const id = Number(dados.get("id"));
  if (!Number.isInteger(id)) return;

  await db.update(articles).set({ status: estado }).where(eq(articles.id, id));
  revalidar(String(dados.get("slug") ?? ""));
}

export async function publicar(dados: FormData): Promise<void> {
  await mudarEstado(dados, "published");
}

/** Tira do ar sem apagar: continua editável e pode voltar. */
export async function despublicar(dados: FormData): Promise<void> {
  await mudarEstado(dados, "hidden");
}

/** Devolve à fila de revisão. */
export async function devolverParaRevisao(dados: FormData): Promise<void> {
  await mudarEstado(dados, "review");
}

/**
 * Salva a edição. Vale para matéria já publicada também — corrigir uma frase
 * depois de no ar é operação normal de portal, não exceção.
 */
export async function salvar(dados: FormData): Promise<void> {
  await exigirSessao();

  const id = Number(dados.get("id"));
  const titulo = String(dados.get("titulo") ?? "").trim();
  const resumo = String(dados.get("resumo") ?? "").trim();
  const conteudo = String(dados.get("conteudo") ?? "").trim();
  const categoria = String(dados.get("categoria") ?? "").trim();
  const imagemUrl = String(dados.get("imagemUrl") ?? "").trim();
  const publicarAgora = dados.get("publicar") === "1";

  if (!Number.isInteger(id) || !titulo || !resumo) return;

  await db
    .update(articles)
    .set({
      title: titulo.slice(0, 200),
      excerpt: resumo.slice(0, 400),
      // Normaliza para o formato que a reescrita grava: parágrafos separados
      // por linha em branco.
      content: conteudo ? conteudo.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n") : null,
      category: categoria || null,
      imageUrl: imagemUrl || null,
      ...(publicarAgora ? { status: "published" as const } : {}),
    })
    .where(eq(articles.id, id));

  revalidar(String(dados.get("slug") ?? ""));
  redirect(publicarAgora ? "/admin?estado=published&salvo=1" : `/admin/materia/${id}?salvo=1`);
}
