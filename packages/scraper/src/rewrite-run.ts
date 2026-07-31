import { config } from "dotenv";

config({ path: new URL("../../../.env", import.meta.url).pathname });

import { and, articles, createDb, desc, eq, isNull, sources } from "@netfor/db";

import { extractArticleText } from "./core/extract";
import { criarProvedor, type MateriaReescrita, type ProvedorDeReescrita } from "./rewrite";
import { medirOriginalidade } from "./rewrite/originalidade";

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

const REFORCO =
  "A tentativa anterior reaproveitou trechos literais do original e foi descartada. " +
  "Reescreva partindo dos fatos, com estrutura de frase e ordem de parágrafos próprias. " +
  "Só mantenha idêntico o que estiver entre aspas como declaração.";

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
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const nova = await provedor.reescrever({
      ...pedido,
      ...(tentativa === 2 ? { reforco: REFORCO } : {}),
    });

    const medida = medirOriginalidade(paragrafosParaTexto(nova.paragrafos), pedido.textoOriginal);
    if (medida.aprovado) return nova;

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

  const pendentes = await db
    .select({
      id: articles.id,
      titulo: articles.title,
      url: articles.originalUrl,
      veiculo: sources.name,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(and(isNull(articles.content), eq(articles.status, "draft")))
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
        console.error(`  ✗ ${rotulo} — reprovada na trava de originalidade nas duas tentativas`);
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
