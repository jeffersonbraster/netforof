"use server";

import { articles, eq, matches } from "@netfor/db";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { criarSessao, encerrarSessao, exigirSessao, senhaCorreta } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { criarMateriaPropria } from "@/modules/admin/redacao";

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

/**
 * Cria matéria de autoria própria (atualização do portal, tutorial, análise).
 * Não passa pelo scraper nem pela reescrita: já nasce com texto da casa.
 */
export async function criarMateria(dados: FormData): Promise<void> {
  await exigirSessao();

  const titulo = String(dados.get("titulo") ?? "").trim();
  const resumo = String(dados.get("resumo") ?? "").trim();
  const conteudo = String(dados.get("conteudo") ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!titulo || !resumo || !conteudo) return;

  const id = await criarMateriaPropria({
    titulo,
    resumo,
    conteudo,
    categoria: String(dados.get("categoria") ?? "").trim() || null,
    imagemUrl: String(dados.get("imagemUrl") ?? "").trim() || null,
    publicar: dados.get("publicar") === "1",
  });

  revalidateTag("articles", "max");
  redirect(`/admin/materia/${id}?salvo=1`);
}

/**
 * Placar manual — rede de segurança para dia de jogo.
 *
 * A coleta da ESPN roda por cron e o GitHub estrangula agendamento em
 * repositório público, então o placar pode atrasar justamente quando mais
 * importa. Aqui o operador corrige na hora.
 *
 * O valor gravado à mão sobrevive: a coleta seguinte sobrescreve com o dado da
 * ESPN quando ela finalmente atualiza — o que é o comportamento desejado, já
 * que a fonte oficial é mais confiável que a digitação às pressas.
 */
export async function salvarPlacar(dados: FormData): Promise<void> {
  await exigirSessao();

  const id = Number(dados.get("id"));
  if (!Number.isInteger(id)) return;

  const numero = (campo: string): number | null => {
    const bruto = String(dados.get(campo) ?? "").trim();
    if (bruto === "") return null;
    const n = Number.parseInt(bruto, 10);
    return Number.isInteger(n) && n >= 0 && n <= 99 ? n : null;
  };

  const estado = String(dados.get("estado") ?? "");
  const valido = ["scheduled", "live", "finished"] as const;
  const status = (valido as readonly string[]).includes(estado)
    ? (estado as (typeof valido)[number])
    : "scheduled";

  await db
    .update(matches)
    .set({ homeScore: numero("homeScore"), awayScore: numero("awayScore"), status })
    .where(eq(matches.id, id));

  revalidateTag("matches", "max");
  redirect("/admin/jogos?salvo=1");
}
