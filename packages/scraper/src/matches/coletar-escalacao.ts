import { config } from "dotenv";

config({ path: "../../.env" });

import { createDb } from "@netfor/db";

import { syncEscalacoes } from "./escalacoes";

/**
 * Coleta manual de escalação, com janela alargada.
 *
 * Existe para dois momentos reais de operação:
 *  · trazer a escalação de um jogo que já passou da janela automática (ex.: o job
 *    do GitHub Actions falhou naquela rodada);
 *  · conferir a coleta sem esperar o próximo jogo.
 *
 * Uso: `pnpm --filter @netfor/scraper escalacao [horas-para-tras]`
 * O padrão de 48h cobre a rodada inteira.
 */
async function main() {
  const horas = Number.parseInt(process.argv[2] ?? "48", 10);
  const depoisMs = (Number.isFinite(horas) ? horas : 48) * 60 * 60 * 1000;

  const db = createDb();
  const { gravadas, jogos } = await syncEscalacoes(db, { depoisMs });

  console.log(
    `Escalações: ${jogos} jogo(s) na janela de ${horas}h, ${gravadas} lado(s) gravado(s).`,
  );
  if (jogos > 0 && gravadas === 0) {
    console.log("↷ Nada gravado — ou já estava igual, ou a ESPN ainda não publicou os titulares.");
  }
}

main().catch((erro) => {
  console.error("Erro fatal na coleta de escalação:", erro);
  process.exit(1);
});
