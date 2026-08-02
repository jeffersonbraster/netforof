import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Ciclo de vida da matéria no Modo B:
 *   draft     — coletada, ainda sem texto próprio
 *   review    — texto próprio gerado, aguardando aprovação humana
 *   published — no ar e indexável
 *   hidden    — fora do ar (reprovada ou removida a pedido da fonte)
 */
export const articleStatusEnum = pgEnum("article_status", [
  "draft",
  "review",
  "published",
  "hidden",
]);
export const matchStatusEnum = pgEnum("match_status", ["scheduled", "live", "finished"]);
export const chantCategoryEnum = pgEnum("chant_category", ["hino", "canto"]);

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  baseUrl: text("base_url").notNull(),
  logoUrl: text("logo_url"),
  active: boolean("active").notNull().default(true),
});

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    excerpt: text("excerpt").notNull(),
    /**
     * Texto PRÓPRIO da matéria (Modo B), em parágrafos separados por linha em
     * branco. Nulo enquanto a reescrita não rodou — e é este campo que decide se
     * a página pode ser indexada: sem texto próprio, não vai para o índice.
     *
     * O texto ORIGINAL do veículo nunca é gravado: ele é buscado, usado como
     * insumo da reescrita e descartado na memória.
     */
    content: text("content"),
    rewrittenAt: timestamp("rewritten_at", { withTimezone: true }),
    /**
     * Tentativas de reescrita já gastas nesta matéria.
     *
     * Sem isto, matéria que falha sempre — texto não extraível, original curto
     * demais, portal que bloqueia — volta em toda rodada e queima chamada de IA
     * indefinidamente. Ao atingir o teto ela vai para `hidden`, que é a lixeira:
     * sai da fila, não é recoletada (o originalUrl é único) e continua no banco
     * caso valha investigar.
     */
    rewriteAttempts: integer("rewrite_attempts").notNull().default(0),
    rewriteModel: text("rewrite_model"),
    originalUrl: text("original_url").notNull().unique(),
    imageUrl: text("image_url"),
    category: text("category"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
    isHighlighted: boolean("is_highlighted").notNull().default(false),
    status: articleStatusEnum("status").notNull().default("published"),
    contentHash: text("content_hash").notNull(),
  },
  (table) => [
    index("articles_published_at_idx").on(table.publishedAt),
    index("articles_content_hash_idx").on(table.contentHash),
    index("articles_source_id_idx").on(table.sourceId),
  ],
);

export const articleViews = pgTable(
  "article_views",
  {
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.articleId, table.day] })],
);

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    externalId: integer("external_id").notNull().unique(),
    competition: text("competition").notNull(),
    round: text("round"),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    homeLogo: text("home_logo"),
    awayLogo: text("away_logo"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    stadium: text("stadium"),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
    status: matchStatusEnum("status").notNull().default("scheduled"),
  },
  (table) => [index("matches_kickoff_at_idx").on(table.kickoffAt)],
);

export const standings = pgTable("standings", {
  position: integer("position").primaryKey(),
  teamName: text("team_name").notNull(),
  teamLogo: text("team_logo"),
  points: integer("points").notNull(),
  played: integer("played").notNull(),
  wins: integer("wins").notNull(),
  draws: integer("draws").notNull(),
  losses: integer("losses").notNull(),
  goalsFor: integer("goals_for").notNull(),
  goalsAgainst: integer("goals_against").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chants = pgTable("chants", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  lyrics: text("lyrics").notNull(),
  category: chantCategoryEnum("category").notNull(),
  audioUrl: text("audio_url"),
  /** ID do vídeo no YouTube — o player só é montado quando existe. */
  videoId: text("video_id"),
  /** Capa da lista. Nulo cai no banner do NETFOR. */
  imageUrl: text("image_url"),
  order: integer("order").notNull().default(0),
});

/**
 * Configuração de operação, em chave/valor.
 *
 * Vive no banco, não em variável de ambiente, porque quem muda é o operador
 * pelo painel — e precisa valer na hora, sem redeploy. E vive aqui, não no KV,
 * porque quem lê do outro lado é o scraper no GitHub Actions, que não tem
 * binding da Cloudflare mas já tem conexão com o Postgres.
 *
 * Chaves em uso:
 *   publicacao_automatica — "1" manda a reescrita publicar direto, sem passar
 *                           pela fila de revisão. Ausente ou "0" = manual.
 */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type ArticleView = typeof articleViews.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Standing = typeof standings.$inferSelect;
export type NewStanding = typeof standings.$inferInsert;
export type Chant = typeof chants.$inferSelect;
export type NewChant = typeof chants.$inferInsert;
export type Setting = typeof settings.$inferSelect;
