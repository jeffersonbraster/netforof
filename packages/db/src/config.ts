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

/* -------------------------------------------------------------------------- */
/* Arquétipo de destaque da home                                              */
/* -------------------------------------------------------------------------- */

export const CHAVE_DESTAQUE_LAYOUT = "destaque_layout";

/**
 * Como a área de destaque da home é composta.
 *
 * O `design.md` do projeto lista o arquétipo de destaque da home como uma das
 * duas coisas que PODEM variar dentro do sistema travado. Isto é a implementação
 * dessa licença: o operador escolhe a composição pelo painel, sem deploy.
 *
 *   tres  — manchete grande + duas ao lado. O padrão, e o que o portal fazia.
 *   duas  — duas manchetes de peso igual, 50/50. Para o dia com dois assuntos.
 *   uma   — uma só ocupando a área inteira. Para quando um assunto domina.
 *   uber  — faixa de plantão, sangrando a margem. Para o que interrompe o dia.
 *
 * A ordem aqui é a ordem de intensidade, e é a mesma que o painel apresenta.
 */
export const DESTAQUE_LAYOUTS = ["tres", "duas", "uma", "uber"] as const;
export type DestaqueLayout = (typeof DESTAQUE_LAYOUTS)[number];

/** Quantos slots de destaque cada modo consome. Usado pela home e pelo painel. */
export const SLOTS_POR_LAYOUT: Record<DestaqueLayout, number> = {
  tres: 3,
  duas: 2,
  uma: 1,
  uber: 1,
};

function ehLayout(valor: string | null): valor is DestaqueLayout {
  return valor !== null && (DESTAQUE_LAYOUTS as readonly string[]).includes(valor);
}

/**
 * O padrão é `tres` — inclusive quando a linha não existe ou traz lixo.
 *
 * Mesmo raciocínio do interruptor de publicação: se a leitura falhar por schema
 * desatualizado ou valor escrito à mão errado, o comportamento seguro é a home
 * que o portal já tinha, nunca uma faixa de plantão surgindo sozinha.
 */
export async function destaqueLayout(db: Db): Promise<DestaqueLayout> {
  const valor = await ler(db, CHAVE_DESTAQUE_LAYOUT);
  return ehLayout(valor) ? valor : "tres";
}

export async function definirDestaqueLayout(db: Db, layout: DestaqueLayout): Promise<void> {
  await db
    .insert(settings)
    .values({ key: CHAVE_DESTAQUE_LAYOUT, value: layout })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: layout, updatedAt: new Date() },
    });
}
