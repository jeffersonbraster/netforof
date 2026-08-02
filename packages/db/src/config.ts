import { eq } from "drizzle-orm";

import type { Db } from "./client";
import { settings } from "./schema";

/**
 * Leitura e escrita da configuração de operação.
 *
 * Fica em `@netfor/db` porque os dois lados precisam da MESMA definição: o
 * painel (Worker) escreve, o scraper (GitHub Actions) lê. Duplicar a chave em
 * cada lado é como uma das pontas passa a ler algo que a outra nunca escreve.
 */

export const CHAVE_PUBLICACAO_AUTOMATICA = "publicacao_automatica";

async function ler(db: Db, chave: string): Promise<string | null> {
  const [linha] = await db
    .select({ valor: settings.value })
    .from(settings)
    .where(eq(settings.key, chave))
    .limit(1);
  return linha?.valor ?? null;
}

/**
 * Publicação automática ligada?
 *
 * O padrão é `false` — inclusive quando a linha não existe. Se algum dia a
 * leitura falhar por schema desatualizado, o comportamento seguro é cair na
 * revisão manual, nunca colocar texto no ar sem ninguém ter visto.
 */
export async function publicacaoAutomaticaLigada(db: Db): Promise<boolean> {
  return (await ler(db, CHAVE_PUBLICACAO_AUTOMATICA)) === "1";
}

export async function definirPublicacaoAutomatica(db: Db, ligada: boolean): Promise<void> {
  await db
    .insert(settings)
    .values({ key: CHAVE_PUBLICACAO_AUTOMATICA, value: ligada ? "1" : "0" })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: ligada ? "1" : "0", updatedAt: new Date() },
    });
}
