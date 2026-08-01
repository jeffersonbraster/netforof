import { config } from "dotenv";

config({ path: "../../.env" });

import { createDb } from "@netfor/db";

import { runSource } from "./core/pipeline";
import { notifyRevalidate } from "./core/revalidate";
import { diarioDoNordeste } from "./sources/diario-do-nordeste";
import { espn } from "./sources/espn";
import { fortaleza1918 } from "./sources/fortaleza1918";
import { geGlobo } from "./sources/ge-globo";
import { oPovo } from "./sources/opovo";
import { souFortaleza } from "./sources/sou-fortaleza";
import { trivela } from "./sources/trivela";
import type { NewsSource, SourceRunSummary } from "./types";

const allSources: NewsSource[] = [
  geGlobo,
  fortaleza1918,
  diarioDoNordeste,
  souFortaleza,
  oPovo,
  espn,
  trivela,
];

async function main() {
  const startedAt = Date.now();
  console.log(`NetForBot iniciando — ${allSources.length} fontes\n`);

  const db = createDb();
  const results = await Promise.allSettled(allSources.map((source) => runSource(db, source)));

  const summaries: SourceRunSummary[] = results.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    return {
      source: allSources[index]!.slug,
      fetched: 0,
      inserted: 0,
      duplicates: 0,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });

  console.log("\nResumo da execução:");
  console.table(
    summaries.map((s) => ({
      fonte: s.source,
      coletados: s.fetched,
      novos: s.inserted,
      duplicados: s.duplicates,
      erro: s.error ?? "—",
    })),
  );

  const totalInserted = summaries.reduce((acc, s) => acc + s.inserted, 0);
  let hasErrors = summaries.some((s) => s.error);

  if (totalInserted > 0 && !(await notifyRevalidate(["articles"]))) {
    hasErrors = true;
  }

  console.log(
    `\nConcluído em ${((Date.now() - startedAt) / 1000).toFixed(1)}s — ${totalInserted} novas matérias.`,
  );
  if (hasErrors) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Erro fatal no scraper:", error);
  process.exit(1);
});
