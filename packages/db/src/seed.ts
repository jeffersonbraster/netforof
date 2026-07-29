import { config } from "dotenv";

config({ path: "../../.env" });

import { createDb } from "./client";
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
    ge?.id ??
    (await db.query.sources.findFirst({ where: (s, { eq }) => eq(s.slug, "ge") }))?.id;

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

  await db
    .insert(chants)
    .values([
      {
        title: "Hino do Fortaleza Esporte Clube",
        slug: "hino-do-fortaleza-esporte-clube",
        lyrics:
          "Fortaleza querido, Fortaleza adorado\n" +
          "És o clube do povo, do povo o clube amado\n" +
          "Tuas cores tricolores são o nosso orgulho\n" +
          "Vermelho, azul e branco, paixão do Ceará",
        category: "hino",
        order: 1,
      },
      {
        title: "Avante Leão",
        slug: "avante-leao",
        lyrics:
          "Avante Leão, avante Leão\n" +
          "A torcida tricolor te empurra com o coração\n" +
          "No Castelão lotado, o canto não vai parar\n" +
          "Fortaleza, Fortaleza, vamos juntos ao ataque",
        category: "canto",
        order: 2,
      },
      {
        title: "Sou Tricolor de Aço",
        slug: "sou-tricolor-de-acao",
        lyrics:
          "Sou tricolor de aço, sou de tanto amor\n" +
          "Onde o Leão jogar, estarei eu com meu tambor\n" +
          "Não importa a distância, nem o resultado\n" +
          "Fortaleza do meu coração, sempre ao teu lado",
        category: "canto",
        order: 3,
      },
    ])
    .onConflictDoNothing({ target: chants.slug });

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
