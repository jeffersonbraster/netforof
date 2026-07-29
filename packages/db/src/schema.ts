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

export const articleStatusEnum = pgEnum("article_status", ["published", "hidden"]);
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
    content: text("content"),
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
  order: integer("order").notNull().default(0),
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
