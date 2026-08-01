import { config } from "dotenv";

config({ path: new URL("../../../.env", import.meta.url).pathname });

import { sql } from "drizzle-orm";

import { createDb } from "./client";
import { capaDoYoutube } from "./data/cantos";
import { limparIndentacao, tratarLetra } from "./data/mascarar";
import { chants } from "./schema";

/**
 * Importa o catálogo de cantos a partir do arquivo do dono do portal.
 *
 * Existe para o dono não precisar transcrever nada à mão: aponte para o arquivo
 * que já tem o array e o resto é automático — mapeamento de campos, capa do
 * YouTube quando falta arte, máscara de palavrão e descarte do verso com ataque.
 *
 *   pnpm --filter @netfor/db importar-cantos ./caminho/para/videos-data.ts
 *
 * O arquivo precisa exportar `videosData` (ou ser o export default) como lista
 * de objetos com: title, slug, embed, letra e, opcionalmente, img.
 */

interface EntradaBruta {
  title?: string;
  slug?: string;
  embed?: string;
  img?: string;
  letra?: string;
  lyrics?: string;
}

function ehHino(entrada: EntradaBruta): boolean {
  const alvo = `${entrada.slug ?? ""} ${entrada.title ?? ""}`.toLowerCase();
  return alvo.includes("hino");
}

async function main() {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error("Uso: pnpm --filter @netfor/db importar-cantos <arquivo>");
    console.error("O arquivo deve exportar `videosData` com title, slug, embed e letra.");
    process.exitCode = 1;
    return;
  }

  const absoluto = caminho.startsWith("/") ? caminho : `${process.cwd()}/${caminho}`;
  const modulo = (await import(absoluto)) as Record<string, unknown>;
  const bruto = (modulo.videosData ?? modulo.default) as EntradaBruta[] | undefined;

  if (!Array.isArray(bruto) || bruto.length === 0) {
    console.error(`✗ Não achei um array \`videosData\` em ${caminho}.`);
    process.exitCode = 1;
    return;
  }

  const db = createDb();
  const prontos: Array<typeof chants.$inferInsert> = [];
  let semLetra = 0;

  console.log(`Lendo ${bruto.length} entrada(s) de ${caminho}\n`);

  for (const [i, entrada] of bruto.entries()) {
    const titulo = entrada.title?.trim();
    const slug = entrada.slug?.trim();
    const video = entrada.embed?.trim();
    const letraBruta = (entrada.letra ?? entrada.lyrics ?? "").trim();

    if (!titulo || !slug || !video) {
      console.warn(`  ⊘ entrada ${i + 1}: faltam title, slug ou embed — pulada`);
      continue;
    }
    if (!letraBruta) {
      semLetra++;
      console.warn(`  ⊘ ${slug}: sem letra — pulada`);
      continue;
    }

    const tratada = tratarLetra(limparIndentacao(letraBruta));

    if (tratada.palavroesMascarados.length > 0) {
      console.log(`  ✎ ${slug}: mascarado ${[...new Set(tratada.palavroesMascarados)].join(", ")}`);
    }
    if (tratada.versosDescartados > 0) {
      console.warn(
        `  ✂ ${slug}: ${tratada.versosDescartados} verso(s) descartado(s) por ataque (${tratada.ataquesRemovidos.join(", ")})`,
      );
    }

    prontos.push({
      title: titulo,
      slug,
      lyrics: tratada.texto,
      category: ehHino(entrada) ? "hino" : "canto",
      videoId: video,
      imageUrl: entrada.img?.startsWith("http") ? entrada.img : capaDoYoutube(video),
      order: ehHino(entrada) ? 0 : i + 1,
    });
  }

  if (prontos.length === 0) {
    console.error("\n✗ Nada para importar.");
    process.exitCode = 1;
    return;
  }

  await db
    .insert(chants)
    .values(prontos)
    .onConflictDoUpdate({
      target: chants.slug,
      set: {
        title: sql`excluded.title`,
        lyrics: sql`excluded.lyrics`,
        category: sql`excluded.category`,
        videoId: sql`excluded.video_id`,
        imageUrl: sql`excluded.image_url`,
        order: sql`excluded."order"`,
      },
    });

  console.log(`\n✓ ${prontos.length} canto(s) importado(s).`);
  if (semLetra > 0) console.log(`  ${semLetra} sem letra ficaram de fora.`);
  console.log("Rode o site e confira em /cantos-da-torcida.");
}

main().catch((erro) => {
  console.error("✗ Falha na importação:", erro);
  process.exitCode = 1;
});
