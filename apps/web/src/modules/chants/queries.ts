import { asc, eq } from "@netfor/db";
import { cacheLife, cacheTag } from "next/cache";

import { chants, type Chant } from "@netfor/db";

import { db } from "@/lib/db";

export async function getChants(): Promise<Chant[]> {
  "use cache";
  cacheTag("chants");
  cacheLife("days");

  return db.select().from(chants).orderBy(asc(chants.order), asc(chants.title));
}

export async function getChantBySlug(slug: string): Promise<Chant | null> {
  "use cache";
  cacheTag("chants", `chant-${slug}`);
  cacheLife("days");

  const [row] = await db.select().from(chants).where(eq(chants.slug, slug)).limit(1);
  return row ?? null;
}
