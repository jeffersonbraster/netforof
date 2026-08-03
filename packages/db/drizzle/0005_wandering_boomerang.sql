CREATE TYPE "public"."lineup_side" AS ENUM('home', 'away');--> statement-breakpoint
CREATE TABLE "lineups" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"side" "lineup_side" NOT NULL,
	"team_name" text NOT NULL,
	"team_logo" text,
	"formation" text,
	"players" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lineups_match_side_unique" UNIQUE("match_id","side")
);
--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;