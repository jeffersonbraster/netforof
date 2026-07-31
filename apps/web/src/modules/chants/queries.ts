import { asc } from "@netfor/db";
import { cacheLife, cacheTag } from "next/cache";

import { chants, type Chant } from "@netfor/db";

import { db } from "@/lib/db";

export async function getChants(): Promise<Chant[]> {
  "use cache";
  cacheTag("chants");
  cacheLife("days");

  return db.select().from(chants).orderBy(asc(chants.order), asc(chants.title));
}

/**
 * Busca na lista já cacheada em vez de uma query por slug. São poucos cantos, e
 * assim o slug da URL não vira chave de cache: antes, cada `/cantos-da-torcida/
 * <lixo>` gravava uma entrada nova no KV (inclusive o `null`).
 */
export async function getChantBySlug(slug: string): Promise<Chant | null> {
  const todos = await getChants();
  return todos.find((chant) => chant.slug === slug) ?? null;
}
