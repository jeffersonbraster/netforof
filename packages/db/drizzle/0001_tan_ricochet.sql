ALTER TYPE "public"."article_status" ADD VALUE 'draft' BEFORE 'published';--> statement-breakpoint
ALTER TYPE "public"."article_status" ADD VALUE 'review' BEFORE 'published';--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "rewritten_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "rewrite_model" text;