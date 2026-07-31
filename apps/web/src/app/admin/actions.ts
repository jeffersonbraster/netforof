"use server";

import { articles, eq } from "@netfor/db";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { criarSessao, encerrarSessao, exigirSessao, senhaCorreta } from "@/lib/admin-auth";
import { db } from "@/lib/db";

/**
 * Toda ação revalida a sessão por conta própria. O gate do layout protege a
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

/** Aprova o texto como está e coloca no ar. */
export async function aprovar(dados: FormData): Promise<void> {
  await exigirSessao();
  const id = Number(dados.get("id"));
  if (!Number.isInteger(id)) return;

  await db.update(articles).set({ status: "published" }).where(eq(articles.id, id));
  revalidateTag("articles", "max");
  revalidateTag(`article-${dados.get("slug")}`, "max");
}

/** Descarta: sai da fila e não vai ao ar. */
export async function reprovar(dados: FormData): Promise<void> {
  await exigirSessao();
  const id = Number(dados.get("id"));
  if (!Number.isInteger(id)) return;

  await db.update(articles).set({ status: "hidden" }).where(eq(articles.id, id));
  revalidateTag("articles", "max");
}

/**
 * Salva as correções e publica. Poder ajustar uma frase antes de publicar é o
 * que faz a revisão valer — sem isso só dá para aceitar ou descartar em bloco.
 */
export async function editarEPublicar(dados: FormData): Promise<void> {
  await exigirSessao();

  const id = Number(dados.get("id"));
  const titulo = String(dados.get("titulo") ?? "").trim();
  const resumo = String(dados.get("resumo") ?? "").trim();
  const conteudo = String(dados.get("conteudo") ?? "").trim();

  if (!Number.isInteger(id) || !titulo || !resumo || !conteudo) return;

  await db
    .update(articles)
    .set({
      title: titulo.slice(0, 200),
      excerpt: resumo.slice(0, 400),
      // Normaliza para o mesmo formato que a reescrita grava: parágrafos
      // separados por linha em branco.
      content: conteudo.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n"),
      status: "published",
    })
    .where(eq(articles.id, id));

  revalidateTag("articles", "max");
  revalidateTag(`article-${dados.get("slug")}`, "max");
}
