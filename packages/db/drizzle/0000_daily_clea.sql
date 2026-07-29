CREATE TYPE "public"."article_status" AS ENUM('published', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."chant_category" AS ENUM('hino', 'canto');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'finished');--> statement-breakpoint
CREATE TABLE "article_views" (
	"article_id" integer NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "article_views_article_id_day_pk" PRIMARY KEY("article_id","day")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text,
	"original_url" text NOT NULL,
	"image_url" text,
	"category" text,
	"published_at" timestamp with time zone NOT NULL,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_highlighted" boolean DEFAULT false NOT NULL,
	"status" "article_status" DEFAULT 'published' NOT NULL,
	"content_hash" text NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "articles_original_url_unique" UNIQUE("original_url")
);
--> statement-breakpoint
CREATE TABLE "chants" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"lyrics" text NOT NULL,
	"category" "chant_category" NOT NULL,
	"audio_url" text,
	"order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "chants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" integer NOT NULL,
	"competition" text NOT NULL,
	"round" text,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"home_logo" text,
	"away_logo" text,
	"home_score" integer,
	"away_score" integer,
	"stadium" text,
	"kickoff_at" timestamp with time zone NOT NULL,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	CONSTRAINT "matches_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"base_url" text NOT NULL,
	"logo_url" text,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"position" integer PRIMARY KEY NOT NULL,
	"team_name" text NOT NULL,
	"team_logo" text,
	"points" integer NOT NULL,
	"played" integer NOT NULL,
	"wins" integer NOT NULL,
	"draws" integer NOT NULL,
	"losses" integer NOT NULL,
	"goals_for" integer NOT NULL,
	"goals_against" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_views" ADD CONSTRAINT "article_views_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "articles_content_hash_idx" ON "articles" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "articles_source_id_idx" ON "articles" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "matches_kickoff_at_idx" ON "matches" USING btree ("kickoff_at");