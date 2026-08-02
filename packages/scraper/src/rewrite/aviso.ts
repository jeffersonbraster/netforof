import { escaparHtml } from "../core/telegram";

/**
 * Texto do aviso da rodada de reescrita.
 *
 * Fica separado do `rewrite-run.ts` para ser função pura e testável: aquele
 * arquivo dispara `main()` ao ser importado, então não dá para exercitar a
 * mensagem sem rodar a reescrita inteira — e reescrita custa chamada de IA.
 */

const SITE = process.env.SITE_URL?.replace(/\/$/, "") || "https://netfor.com.br";

/** Uma linha por matéria no aviso — título, veículo e tamanho do texto. */
export interface Escrita {
  titulo: string;
  veiculo: string;
  slug: string;
  caracteres: number;
}

/**
 * Diz a ABA para onde ir, porque é isso que transforma o aviso em ação: no
 * manual as matérias esperam em "Aguardando revisão"; no automático já estão em
 * "No ar" e o que resta é conferir. O total da fila entra separado do número
 * desta rodada — sem ele não dá para saber se a fila está crescendo.
 *
 * No automático cada título vira link direto para a matéria no site: ela já
 * está publicada, e o que se quer é conferir o resultado, não abrir o painel.
 */
export function montarAviso(opcoes: {
  escritas: Escrita[];
  automatico: boolean;
  filaDeRevisao: number;
  arquivadas: number;
}): string {
  const { escritas, automatico, filaDeRevisao, arquivadas } = opcoes;
  const n = escritas.length;
  const plural = n === 1 ? "matéria" : "matérias";

  const cabecalho = automatico
    ? `✅ <b>NETFOR</b> — ${n} ${plural} ${n === 1 ? "publicada" : "publicadas"} automaticamente`
    : `📝 <b>NETFOR</b> — ${n} ${plural} aguardando revisão`;

  const linhas = escritas.map((e) => {
    const titulo = escaparHtml(e.titulo);
    const meta = `${escaparHtml(e.veiculo)} · ${e.caracteres} caracteres`;
    return automatico
      ? `• <a href="${SITE}/noticias/${e.slug}">${titulo}</a>\n  <i>${meta}</i>`
      : `• ${titulo}\n  <i>${meta}</i>`;
  });

  const aba = automatico ? "No ar" : "Aguardando revisão";
  const estado = automatico ? "published" : "review";

  const rodape = [
    `Aba <b>${aba}</b>: <a href="${SITE}/admin?estado=${estado}">abrir o painel</a>`,
    filaDeRevisao > 0
      ? `Fila de revisão: <b>${filaDeRevisao}</b> no total.`
      : "Fila de revisão vazia.",
    arquivadas > 0
      ? `⚠️ ${arquivadas} ${arquivadas === 1 ? "matéria foi arquivada" : "matérias foram arquivadas"} nesta rodada (sem texto aproveitável ou reprovada nas travas).`
      : null,
  ].filter(Boolean);

  return `${cabecalho}\n\n${linhas.join("\n")}\n\n${rodape.join("\n")}`;
}
