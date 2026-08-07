"use server";

import {
  articles,
  definirDestaqueLayout,
  definirPublicacaoAutomatica,
  DESTAQUE_LAYOUTS,
  eq,
  inArray,
  isNotNull,
  matches,
  and,
  type DestaqueLayout,
} from "@netfor/db";
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

type EstadoAlvo = "published" | "hidden" | "review";

/**
 * Para onde voltar depois da ação.
 *
 * A lista precisava de F5 para refletir a mudança: a Server Action alterava o
 * banco e devolvia `void`, e a navegação continuava mostrando o payload
 * anterior. Redirecionar depois de escrever (padrão POST-Redirect-GET) força
 * uma renderização nova e resolve de vez — e ainda preserva filtro, busca e
 * página, que um redirect fixo para "/admin" perderia.
 *
 * Só aceita caminho interno do painel: o valor vem do formulário, e sem esta
 * checagem viraria redirecionamento aberto para domínio de terceiro.
 */
function destinoSeguro(bruto: FormDataEntryValue | null): string {
  const valor = typeof bruto === "string" ? bruto : "";
  return valor.startsWith("/admin") && !valor.startsWith("//") ? valor : "/admin";
}

async function aplicarEstado(ids: number[], estado: EstadoAlvo): Promise<number> {
  if (ids.length === 0) return 0;

  // Busca os slugs ANTES de mudar o estado: cada matéria tem sua própria tag de
  // cache (`article-<slug>`), e sem elas a página no ar continuaria servindo a
  // versão antiga por até 30 dias.
  const alvos = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(inArray(articles.id, ids));

  await db.update(articles).set({ status: estado }).where(inArray(articles.id, ids));

  revalidateTag("articles", "max");
  for (const { slug } of alvos) revalidateTag(`article-${slug}`, "max");
  return alvos.length;
}

/**
 * Ações de um item só. Recebem id e slug por `.bind()` em vez de campo oculto
 * porque agora a lista inteira vive dentro de UM formulário (o do lote): com
 * campo oculto, todo item mandaria o seu e o servidor não saberia qual botão
 * foi apertado. Formulário aninhado não é HTML válido, então bind é a saída.
 */
async function mudarUm(id: number, slug: string, estado: EstadoAlvo, dados: FormData) {
  await exigirSessao();
  if (!Number.isInteger(id)) return;

  await db.update(articles).set({ status: estado }).where(eq(articles.id, id));
  revalidar(slug);
  redirect(destinoSeguro(dados.get("voltar")));
}

export async function publicar(id: number, slug: string, dados: FormData): Promise<void> {
  await mudarUm(id, slug, "published", dados);
}

/**
 * Manda para a lixeira (`hidden`).
 *
 * É um movimento só com dois nomes na tela: "Descartar" quando a matéria está
 * aguardando revisão e não vale a pena, "Despublicar" quando já estava no ar. O
 * destino é o mesmo — sai da fila, sai do site, continua no banco e pode voltar.
 *
 * NÃO existe apagar de verdade, e é de propósito: `articles.original_url` é
 * único, e é justamente esse índice que impede o scraper de recoletar o que já
 * passou por aqui. Apagar a linha liberaria a URL, e a matéria descartada
 * voltaria para a fila na coleta seguinte — o operador descartaria a mesma coisa
 * para sempre.
 */
export async function arquivar(id: number, slug: string, dados: FormData): Promise<void> {
  await mudarUm(id, slug, "hidden", dados);
}

/** Devolve à fila de revisão. Tira da lixeira. */
export async function devolverParaRevisao(
  id: number,
  slug: string,
  dados: FormData,
): Promise<void> {
  await mudarUm(id, slug, "review", dados);
}

/**
 * Liga/desliga a publicação automática.
 *
 * Só muda o que a REESCRITA faz com matéria nova: ligada, ela entra publicada
 * em vez de parar na fila de revisão. Não mexe em nada que já está no banco —
 * o que está aguardando revisão continua aguardando, e é isso que se quer:
 * ligar o automático não deve despejar no ar uma fila acumulada sem ninguém
 * ter olhado.
 */
export async function alternarPublicacaoAutomatica(dados: FormData): Promise<void> {
  await exigirSessao();
  await definirPublicacaoAutomatica(db, dados.get("ligar") === "1");
  redirect(destinoSeguro(dados.get("voltar")));
}

/**
 * Troca a composição do destaque da home.
 *
 * Revalida `config` E `articles`: o modo decide QUANTOS slots a home preenche,
 * então mudar de `tres` para `uma` também muda quais matérias sobram para a
 * lista de últimas. Revalidar só a configuração deixaria a lista com um buraco
 * ou uma repetição até a próxima matéria entrar.
 */
export async function definirModoDestaque(dados: FormData): Promise<void> {
  await exigirSessao();

  const escolhido = String(dados.get("layout") ?? "");
  if (!(DESTAQUE_LAYOUTS as readonly string[]).includes(escolhido)) {
    redirect(destinoSeguro(dados.get("voltar")));
  }

  await definirDestaqueLayout(db, escolhido as DestaqueLayout);
  revalidateTag("config", "max");
  revalidateTag("articles", "max");
  redirect(destinoSeguro(dados.get("voltar")));
}

/**
 * Fixa (ou solta) uma matéria num slot do destaque.
 *
 * `posicao` nula solta. Antes de gravar, o slot é limpo em QUALQUER outra
 * matéria: o índice único no banco recusaria a segunda fixação com erro de
 * constraint, e o operador veria uma tela de erro em vez do efeito que pediu.
 * Trocar quem ocupa o slot 1 é justamente a operação mais comum aqui.
 *
 * DUAS ESCRITAS SOLTAS, SEM TRANSAÇÃO — e não por descuido: o driver HTTP do
 * Neon (`drizzle-orm/neon-http`) não suporta transação, e a primeira versão
 * disto quebrava em produção com "No transactions support in neon-http driver".
 * Só apareceu ao clicar o botão num navegador de verdade; o typecheck passava.
 *
 * A ordem importa e torna o estado intermediário inofensivo: limpar primeiro
 * deixa o slot VAZIO por alguns milissegundos, nunca duplicado. Slot vazio a
 * home preenche por recência; slot duplicado seria erro de constraint. E como a
 * revalidação só acontece depois das duas escritas, esse instante não chega a
 * ser renderizado.
 */
export async function fixarNoDestaque(
  id: number,
  posicao: number | null,
  dados: FormData,
): Promise<void> {
  await exigirSessao();

  if (posicao !== null && ![1, 2, 3].includes(posicao)) {
    redirect(destinoSeguro(dados.get("voltar")));
  }

  if (posicao !== null) {
    await db
      .update(articles)
      .set({ pinnedPosition: null })
      .where(eq(articles.pinnedPosition, posicao));
  }
  await db.update(articles).set({ pinnedPosition: posicao }).where(eq(articles.id, id));

  revalidateTag("articles", "max");
  redirect(destinoSeguro(dados.get("voltar")));
}

/**
 * Liga ou desliga a estrela editorial.
 *
 * Diferente da fixação: a estrela não escolhe POSIÇÃO, escolhe QUEM entra. As
 * estreladas ocupam os slots que a fixação deixou livres, da mais recente para a
 * mais antiga. É a marcação do dia a dia — um clique, sem decidir ordem —,
 * enquanto o pino é a exceção precisa.
 *
 * Sem nenhuma das duas, o destaque volta a ser "as mais novas", que é o
 * comportamento histórico e continua valendo como padrão.
 */
export async function alternarEstrela(id: number, ligar: boolean, dados: FormData): Promise<void> {
  await exigirSessao();
  await db.update(articles).set({ isHighlighted: ligar }).where(eq(articles.id, id));
  revalidateTag("articles", "max");
  redirect(destinoSeguro(dados.get("voltar")));
}

function idsSelecionados(dados: FormData): number[] {
  return dados
    .getAll("ids")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/**
 * Aprovação em lote.
 *
 * Publica só o que TEM texto próprio, mesmo que o operador marque tudo. Sem
 * esse filtro, "selecionar todas" na aba de rascunho colocaria no ar matéria
 * sem texto da casa — que é justamente o que não pode ir para o índice no
 * Modo B. O que não passa é silenciosamente ignorado e continua na lista.
 */
export async function publicarSelecionadas(dados: FormData): Promise<void> {
  await exigirSessao();
  const ids = idsSelecionados(dados);
  if (ids.length === 0) redirect(destinoSeguro(dados.get("voltar")));

  const publicaveis = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(inArray(articles.id, ids), isNotNull(articles.content)));

  const quantos = await aplicarEstado(
    publicaveis.map((a) => a.id),
    "published",
  );

  const destino = destinoSeguro(dados.get("voltar"));
  const separador = destino.includes("?") ? "&" : "?";
  redirect(`${destino}${separador}lote=${quantos}&pedidas=${ids.length}`);
}

/**
 * Manda várias para a lixeira. Não precisa de filtro: qualquer estado pode sair.
 * É o par em lote de `arquivar` — mesma operação, mesmo destino.
 */
export async function arquivarSelecionadas(dados: FormData): Promise<void> {
  await exigirSessao();
  const ids = idsSelecionados(dados);
  const quantos = await aplicarEstado(ids, "hidden");

  const destino = destinoSeguro(dados.get("voltar"));
  const separador = destino.includes("?") ? "&" : "?";
  redirect(`${destino}${separador}lote=${quantos}&pedidas=${ids.length}`);
}

/** Tira várias da lixeira de uma vez, de volta para a fila de revisão. */
export async function restaurarSelecionadas(dados: FormData): Promise<void> {
  await exigirSessao();
  const ids = idsSelecionados(dados);
  const quantos = await aplicarEstado(ids, "review");

  const destino = destinoSeguro(dados.get("voltar"));
  const separador = destino.includes("?") ? "&" : "?";
  redirect(`${destino}${separador}lote=${quantos}&pedidas=${ids.length}`);
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
