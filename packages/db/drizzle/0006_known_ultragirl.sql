CREATE TYPE "public"."lineup_origin" AS ENUM('espn', 'manual');--> statement-breakpoint
ALTER TABLE "lineups" ADD COLUMN "origin" "lineup_origin" DEFAULT 'espn' NOT NULL;