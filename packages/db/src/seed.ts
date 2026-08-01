import { config } from "dotenv";

config({ path: "../../.env" });

import { createDb } from "./client";
import { sql } from "drizzle-orm";

import { CANTOS, capaDoYoutube } from "./data/cantos";
import { limparIndentacao, tratarLetra } from "./data/mascarar";
import { articles, chants, sources } from "./schema";

async function seed() {
  const db = createDb();

  const [ge] = await db
    .insert(sources)
    .values({
      name: "ge (Globo Esporte)",
      slug: "ge",
      baseUrl: "https://ge.globo.com/ce/futebol/times/fortaleza/",
      logoUrl: null,
      active: true,
    })
    .onConflictDoNothing({ target: sources.slug })
    .returning();

  const sourceId =
    ge?.id ?? (await db.query.sources.findFirst({ where: (s, { eq }) => eq(s.slug, "ge") }))?.id;

  if (!sourceId) {
    throw new Error("Falha ao criar/localizar source de seed");
  }

  await db
    .insert(articles)
    .values([
      {
        sourceId,
        title: "Fortaleza vence clássico e sobe na tabela do Brasileirão",
        slug: "fortaleza-vence-classico-e-sobe-na-tabela-do-brasileirao",
        excerpt:
          "Com gols no segundo tempo, o Leão do Pici confirmou o favoritismo no Castelão e ganhou posições na classificação.",
        originalUrl: "https://ge.globo.com/ce/futebol/times/fortaleza/noticia/exemplo-seed-1.ghtml",
        imageUrl: null,
        category: "Brasileirão",
        publishedAt: new Date("2026-07-27T21:30:00-03:00"),
        isHighlighted: true,
        contentHash: "seed-hash-classico-vitoria",
      },
      {
        sourceId,
        title: "Mercado da bola: Fortaleza encaminha contratação de atacante",
        slug: "mercado-da-bola-fortaleza-encaminha-contratacao-de-atacante",
        excerpt:
          "Diretoria do Tricolor do Pici avança em negociação e reforço pode chegar ainda nesta janela de transferências.",
        originalUrl: "https://ge.globo.com/ce/futebol/times/fortaleza/noticia/exemplo-seed-2.ghtml",
        imageUrl: null,
        category: "Mercado da Bola",
        publishedAt: new Date("2026-07-28T10:15:00-03:00"),
        isHighlighted: false,
        contentHash: "seed-hash-mercado-atacante",
      },
    ])
    .onConflictDoNothing({ target: articles.originalUrl });

  // Catálogo curado vive em ./data/cantos.ts, mantido à mão pelo dono do portal.
  // A faixa entra com o vídeo mesmo sem letra: o player já é conteúdo útil, e a
  // letra pode ser preenchida depois sem tocar em mais nada.
  const cantosComLetra = CANTOS;

  // Relatório de triagem: o dono precisa VER o que foi mascarado e, sobretudo,
  // o que a máscara não resolve.
  for (const canto of cantosComLetra) {
    const r = tratarLetra(limparIndentacao(canto.lyrics));
    if (r.palavroesMascarados.length > 0) {
      console.log(`  ✎ ${canto.slug}: mascarado ${[...new Set(r.palavroesMascarados)].join(", ")}`);
    }
    if (r.ataquesEncontrados.length > 0) {
      console.warn(
        `  ⚠️  ${canto.slug}: contém ataque por orientação sexual (${r.ataquesEncontrados.join(", ")}).\n` +
          "     Máscara NÃO resolve isto — alvo e intenção seguem legíveis, e a\n" +
          "     revisão do AdSense em recurso é humana. Decisão editorial necessária.",
      );
    }
  }

  if (cantosComLetra.length > 0) {
    await db
      .insert(chants)
      .values(
        cantosComLetra.map((c) => ({
          title: c.title,
          slug: c.slug,
          // A máscara roda aqui, no seed: vale para faixa nova sem ninguém
          // lembrar de aplicar, e o critério fica num lugar só.
          lyrics: tratarLetra(limparIndentacao(c.lyrics)).texto,
          category: c.category,
          videoId: c.videoId,
          imageUrl: c.imageUrl ?? capaDoYoutube(c.videoId),
          order: c.order,
        })),
      )
      .onConflictDoUpdate({
        target: chants.slug,
        set: {
          videoId: sql`excluded.video_id`,
          imageUrl: sql`excluded.image_url`,
          lyrics: sql`excluded.lyrics`,
          order: sql`excluded."order"`,
        },
      });
  } else {
    console.warn("⚠️  Nenhum canto com letra preenchida em src/data/cantos.ts — nada inserido.");
  }

  const totals = {
    sources: (await db.select().from(sources)).length,
    articles: (await db.select().from(articles)).length,
    chants: (await db.select().from(chants)).length,
  };

  console.log("Seed concluído:", totals);
}

seed().catch((error) => {
  console.error("Erro no seed:", error);
  process.exit(1);
});
