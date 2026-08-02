import { config } from "dotenv";

config({ path: new URL("../../../.env", import.meta.url).pathname });

import {
  and,
  articles,
  count,
  createDb,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  publicacaoAutomaticaLigada,
  sql,
  sources,
} from "@netfor/db";

import { extractArticleText } from "./core/extract";
import { notifyRevalidate } from "./core/revalidate";
import { enviarTelegram } from "./core/telegram";
import { type Escrita, montarAviso } from "./rewrite/aviso";
import { criarProvedor, type MateriaReescrita, type ProvedorDeReescrita } from "./rewrite";
import { medirOriginalidade } from "./rewrite/originalidade";
import { checarMencaoDeVeiculo } from "./rewrite/veiculos";

/**
 * Estágio de reescrita do Modo B.
 *
 * Roda separado da coleta de propósito: a coleta precisa ser rápida e barata, a
 * reescrita é lenta, custa dinheiro e pode falhar por matéria. Separando, uma
 * falha de reescrita não derruba a coleta e o retry é natural — a matéria
 * simplesmente continua sem `content` e entra na próxima rodada.
 *
 * Pega matérias sem texto próprio, extrai o original, reescreve e grava. O texto
 * original NUNCA é gravado: vive só na memória desta função.
 */

const LOTE_PADRAO = 10;

/**
 * Tentativas antes de mandar para a lixeira.
 *
 * Três é o ponto de equilíbrio: cobre falha transitória (portal fora do ar,
 * timeout) sem transformar matéria impossível — original curto demais, texto
 * não extraível — em despesa recorrente de IA a cada rodada.
 */
const MAX_TENTATIVAS = 3;

/**
 * Mínimo de texto na matéria de origem para valer uma reescrita.
 *
 * Abaixo disto não há material: o que sairia seria invenção para preencher.
 * Matéria assim vai direto para a lixeira — a IA nunca deve escrever do zero,
 * só TRATAR material existente.
 */
const MIN_CHARS_ORIGEM = 700;

function paragrafosParaTexto(paragrafos: string[]): string {
  return paragrafos.join("\n\n");
}

/**
 * O reforço aponta o trecho exato que reprovou. Dizer só "você copiou" não
 * ajuda: na primeira rodada real, uma matéria caiu duas vezes por causa de
 * descrição de chaveamento ("o primeiro do grupo B joga contra o segundo do
 * grupo D"), que é linguagem formular e não tem muita alternativa — o modelo
 * precisa saber o que reformular, não uma bronca genérica.
 */
function montarReforco(trecho: string | null): string {
  const base =
    "A tentativa anterior foi descartada por reaproveitar texto literal do original. " +
    "Reescreva partindo dos fatos, com estrutura de frase e ordem de parágrafos próprias. " +
    "Só mantenha idêntico o que estiver entre aspas como declaração de alguém.";

  if (!trecho) return base;

  return (
    `${base} O trecho reprovado foi: "${trecho}". ` +
    "Diga esse mesmo conteúdo de outro jeito — inverta a ordem, troque a regência, " +
    "quebre ou junte frases. Se for enumeração (chaveamento, tabela, escalação), " +
    "descreva em prosa em vez de repetir a sequência do original."
  );
}

/**
 * Reescreve com trava de originalidade. Uma reprovação vira nova tentativa com
 * reforço explícito; duas reprovações deixam a matéria sem texto, para entrar de
 * novo na próxima rodada. Publicar cópia nunca é opção de fallback.
 */
async function reescreverComTrava(
  provedor: ProvedorDeReescrita,
  pedido: { tituloOriginal: string; textoOriginal: string; veiculo: string },
  aviso: (msg: string) => void,
): Promise<MateriaReescrita | null> {
  let ultimoTrecho: string | null = null;

  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const nova = await provedor.reescrever({
      ...pedido,
      ...(tentativa > 1 ? { reforco: montarReforco(ultimoTrecho) } : {}),
    });

    // Duas travas, na ordem do dano: mencionar veículo expõe a operação;
    // copiar texto é risco autoral. Ambas reprovam e pedem nova tentativa.
    const mencao = checarMencaoDeVeiculo(nova.titulo, nova.resumo, ...nova.paragrafos);
    if (!mencao.limpo) {
      ultimoTrecho = null;
      aviso(
        `menção a veículo (tentativa ${tentativa}): ${mencao.encontrados.join(", ")} — refazendo`,
      );
      continue;
    }

    const medida = medirOriginalidade(paragrafosParaTexto(nova.paragrafos), pedido.textoOriginal);
    if (medida.aprovado) return nova;

    ultimoTrecho = medida.amostra;
    aviso(
      `originalidade reprovada (tentativa ${tentativa}): ${medida.motivo} — "${medida.amostra?.slice(0, 70)}…"`,
    );
  }
  return null;
}

/**
 * Lixeira. `hidden` é o estado certo: fora da fila e fora do site, mas ainda no
 * banco — o `originalUrl` único impede recoleta e a linha fica para consulta.
 */
async function paraLixeira(db: ReturnType<typeof createDb>, id: number): Promise<void> {
  await db
    .update(articles)
    .set({ status: "hidden", rewriteAttempts: MAX_TENTATIVAS })
    .where(eq(articles.id, id));
}

/**
 * Conta a tentativa e, no limite, arquiva. Vale para falha do MODELO — trava de
 * originalidade, menção a veículo, resposta malformada — onde há material bom e
 * repetir faz sentido. Falta de material não passa por aqui: vai direto para a
 * lixeira.
 */
async function registrarFalha(db: ReturnType<typeof createDb>, id: number): Promise<void> {
  const [linha] = await db
    .update(articles)
    .set({ rewriteAttempts: sql`${articles.rewriteAttempts} + 1` })
    .where(eq(articles.id, id))
    .returning({ tentativas: articles.rewriteAttempts });

  if ((linha?.tentativas ?? 0) >= MAX_TENTATIVAS) {
    await db.update(articles).set({ status: "hidden" }).where(eq(articles.id, id));
    console.warn(`    → arquivada após ${MAX_TENTATIVAS} tentativas`);
  }
}

async function main() {
  const limite = Number.parseInt(process.env.REWRITE_BATCH ?? "", 10) || LOTE_PADRAO;
  const db = createDb();

  let provedor;
  try {
    provedor = criarProvedor();
  } catch (erro) {
    console.error(`✗ ${erro instanceof Error ? erro.message : String(erro)}`);
    process.exitCode = 1;
    return;
  }

  /**
   * Em operação normal só toca em rascunho. `REWRITE_BACKFILL=1` inclui o acervo
   * legado do Modo A, que está `published` sem texto próprio: essas voltam para
   * `review` e saem do site até serem aprovadas. Por isso é opt-in e limitado
   * pelo lote — migrar o acervo inteiro de uma vez esvaziaria a home.
   */
  const backfill = process.env.REWRITE_BACKFILL === "1";
  const estados = backfill ? (["draft", "published"] as const) : (["draft"] as const);

  /**
   * O interruptor do painel decide onde a matéria pousa. É lido a cada rodada,
   * não no boot, para que virar a chave valha na rodada seguinte sem redeploy.
   */
  const automatico = await publicacaoAutomaticaLigada(db);
  const estadoFinal = automatico ? ("published" as const) : ("review" as const);

  const pendentes = await db
    .select({
      id: articles.id,
      titulo: articles.title,
      slug: articles.slug,
      url: articles.originalUrl,
      veiculo: sources.name,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(
      and(
        isNull(articles.content),
        inArray(articles.status, [...estados]),
        lt(articles.rewriteAttempts, MAX_TENTATIVAS),
      ),
    )
    .orderBy(desc(articles.publishedAt))
    .limit(limite);

  console.log(
    `Reescrita — ${provedor.nome}/${provedor.modelo} — ${pendentes.length} matéria(s) pendente(s) — ` +
      `publicação ${automatico ? "AUTOMÁTICA" : "manual (fila de revisão)"}\n`,
  );

  const escritas: Escrita[] = [];
  let ok = 0;
  let semTexto = 0;
  let falhou = 0;
  let reprovadas = 0;

  for (const materia of pendentes) {
    const rotulo = materia.titulo.slice(0, 58);

    const original = await extractArticleText(materia.url);

    // Sem texto, ou com texto raso demais, vai para a lixeira NA HORA — sem
    // tentativa, sem chamada de IA. Insistir só gastaria requisição, e gerar
    // texto a partir do nada é exatamente o que não pode acontecer.
    if (!original || original.texto.length < MIN_CHARS_ORIGEM) {
      semTexto++;
      const motivo = original
        ? `origem com só ${original.texto.length} caracteres`
        : "não consegui extrair o texto da fonte";
      await paraLixeira(db, materia.id);
      console.warn(`  🗑 ${rotulo} — ${motivo} · arquivada`);
      continue;
    }

    try {
      const nova = await reescreverComTrava(
        provedor,
        {
          tituloOriginal: materia.titulo,
          textoOriginal: original.texto,
          veiculo: materia.veiculo,
        },
        (msg) => console.warn(`  ⚠ ${rotulo} — ${msg}`),
      );

      if (!nova) {
        reprovadas++;
        await registrarFalha(db, materia.id);
        console.error(`  ✗ ${rotulo} — reprovada nas travas`);
        continue;
      }

      const texto = paragrafosParaTexto(nova.paragrafos);

      await db
        .update(articles)
        .set({
          title: nova.titulo,
          excerpt: nova.resumo,
          content: texto,
          rewrittenAt: new Date(),
          rewriteModel: `${provedor.nome}:${provedor.modelo}`,
          // `review` (fila humana) ou `published` (direto ao ar), conforme o
          // interruptor do painel. As travas acima valem nos dois casos: o
          // automático pula a revisão humana, não a checagem.
          status: estadoFinal,
        })
        .where(eq(articles.id, materia.id));

      escritas.push({
        titulo: nova.titulo,
        veiculo: materia.veiculo,
        slug: materia.slug,
        caracteres: texto.length,
      });
      ok++;
      console.log(`  ✓ ${rotulo}`);
      console.log(`    → ${nova.titulo.slice(0, 70)} (${nova.paragrafos.length} parágrafos)`);
    } catch (erro) {
      falhou++;
      await registrarFalha(db, materia.id);
      console.error(`  ✗ ${rotulo} — ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  console.log(
    `\nConcluído — ${ok} reescrita(s), ${reprovadas} reprovada(s) na trava, ${semTexto} sem texto extraível, ${falhou} com erro.`,
  );

  if (ok === 0) return;

  /**
   * No automático a matéria já está no ar, então o cache PRECISA cair — senão
   * ela existe no banco e não aparece no site. No manual não há o que revalidar:
   * nada mudou para o leitor.
   */
  if (automatico && !(await notifyRevalidate(["articles"]))) {
    process.exitCode = 1;
  }

  const [fila] = await db
    .select({ total: count() })
    .from(articles)
    .where(eq(articles.status, "review"));

  await enviarTelegram(
    montarAviso({
      escritas,
      automatico,
      filaDeRevisao: fila?.total ?? 0,
      arquivadas: semTexto + reprovadas,
    }),
  );

  console.log(
    automatico ? "Publicadas direto (automático ligado)." : "Aguardando revisão antes de publicar.",
  );
}

main().catch((erro) => {
  console.error("✗ Falha inesperada na reescrita:", erro);
  process.exitCode = 1;
});
