import { config } from "dotenv";

config({ path: new URL("../../../.env", import.meta.url).pathname });

import { and, articles, createDb, desc, eq, inArray, isNull, sources } from "@netfor/db";

import { extractArticleText } from "./core/extract";
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

  const pendentes = await db
    .select({
      id: articles.id,
      titulo: articles.title,
      url: articles.originalUrl,
      veiculo: sources.name,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(and(isNull(articles.content), inArray(articles.status, [...estados])))
    .orderBy(desc(articles.publishedAt))
    .limit(limite);

  console.log(
    `Reescrita — ${provedor.nome}/${provedor.modelo} — ${pendentes.length} matéria(s) pendente(s)\n`,
  );

  let ok = 0;
  let semTexto = 0;
  let falhou = 0;
  let reprovadas = 0;

  for (const materia of pendentes) {
    const rotulo = materia.titulo.slice(0, 58);

    const original = await extractArticleText(materia.url);
    if (!original) {
      semTexto++;
      console.warn(`  ⊘ ${rotulo} — não consegui extrair o texto da fonte`);
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
        console.error(`  ✗ ${rotulo} — reprovada na trava de originalidade nas três tentativas`);
        continue;
      }

      await db
        .update(articles)
        .set({
          title: nova.titulo,
          excerpt: nova.resumo,
          content: paragrafosParaTexto(nova.paragrafos),
          rewrittenAt: new Date(),
          rewriteModel: `${provedor.nome}:${provedor.modelo}`,
          // Vai para revisão humana, não direto ao ar.
          status: "review",
        })
        .where(eq(articles.id, materia.id));

      ok++;
      console.log(`  ✓ ${rotulo}`);
      console.log(`    → ${nova.titulo.slice(0, 70)} (${nova.paragrafos.length} parágrafos)`);
    } catch (erro) {
      falhou++;
      console.error(`  ✗ ${rotulo} — ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  console.log(
    `\nConcluído — ${ok} reescrita(s), ${reprovadas} reprovada(s) na trava, ${semTexto} sem texto extraível, ${falhou} com erro.`,
  );
  if (ok > 0) console.log("Aguardando revisão antes de publicar.");
}

main().catch((erro) => {
  console.error("✗ Falha inesperada na reescrita:", erro);
  process.exitCode = 1;
});
