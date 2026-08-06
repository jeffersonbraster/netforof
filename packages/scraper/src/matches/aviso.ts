import { agoraEmFortaleza, escaparHtml, MARCA } from "../core/telegram";

/**
 * Texto do aviso do sync de jogos.
 *
 * Separado do `index.ts` pelo mesmo motivo do aviso da reescrita: aquele arquivo
 * dispara `main()` ao ser importado, então não dá para exercitar a mensagem sem
 * bater na ESPN e escrever no banco.
 */

const SITE = process.env.SITE_URL?.replace(/\/$/, "") || "https://netfor.com.br";

/** Quantas mudanças de jogo cabem no aviso antes de virar parede de texto. */
const TETO_DE_LINHAS = 6;

/**
 * Aviso de acontecimento AO VIVO, do plantão de dia de jogo.
 *
 * Separado do `montarAvisoDeSync` de propósito. Aquele é um boletim de
 * sincronização — responde "o que o job gravou nesta rodada" e é o formato
 * certo para a rotina. Em dia de jogo a pergunta é outra: "o que acabou de
 * acontecer no jogo". Reaproveitar o outro formato entregaria "1 escalação
 * atualizada" no lugar de "GOL do Fortaleza, 2 × 1", que é a mensagem que a
 * pessoa quer ler sem abrir nada.
 *
 * Cada acontecimento já vem com a própria marca, então a mensagem é a lista
 * crua: numa notificação de celular, cabeçalho genérico só empurra o que
 * importa para baixo da dobra.
 */
export function montarAvisoAoVivo(opcoes: {
  acontecimentos: string[];
  placar: string;
  relogio: string | null;
  revalidou: boolean;
}): string {
  const { acontecimentos, placar, relogio, revalidou } = opcoes;

  const rodape = revalidou
    ? `<i>${escaparHtml(placar)}${relogio ? ` · ${escaparHtml(relogio)}` : ""} · ${agoraEmFortaleza()}</i>`
    : `${MARCA.falha} <b>O site pode estar mostrando o placar anterior</b> — a revalidação do cache foi recusada.`;

  return `${acontecimentos.join("\n")}\n\n${rodape}`;
}

export function montarAvisoDeSync(opcoes: {
  mudancasDeJogo: string[];
  tabelaMudou: boolean;
  leao: string | null;
  escalacoesGravadas: number;
  revalidou: boolean;
  /** Consultas que falharam sozinhas — vazio quando tudo correu bem. */
  falhas?: string[];
}): string {
  const { mudancasDeJogo, tabelaMudou, leao, escalacoesGravadas, revalidou } = opcoes;
  const falhas = opcoes.falhas ?? [];

  const blocos: string[] = [];

  if (mudancasDeJogo.length > 0) {
    const mostradas = mudancasDeJogo.slice(0, TETO_DE_LINHAS);
    const restantes = mudancasDeJogo.length - mostradas.length;
    blocos.push(
      [
        `${MARCA.jogos} <b>Jogos</b>`,
        ...mostradas.map((m) => `• ${escaparHtml(m)}`),
        restantes > 0 ? `• <i>e mais ${restantes}</i>` : null,
      ]
        .filter((l) => l !== null)
        .join("\n"),
    );
  }

  if (tabelaMudou) {
    // Sem a linha do Leão, "a tabela mudou" não valeria a interrupção: ela muda
    // quase toda rodada por causa de outros times.
    blocos.push(
      `${MARCA.tabela} <b>Classificação</b>\n• ${
        leao ? `Fortaleza ${escaparHtml(leao)}` : "atualizada"
      }`,
    );
  }

  if (escalacoesGravadas > 0) {
    const plural = escalacoesGravadas === 1 ? "escalação atualizada" : "escalações atualizadas";
    blocos.push(
      `${MARCA.escalacao} <b>Escalação</b>\n• ${escalacoesGravadas} ${plural} — <a href="${SITE}/escalacao">ver o campo</a>`,
    );
  }

  /**
   * Falha parcial precisa aparecer no aviso, senão a mensagem mente por omissão:
   * anunciaria o placar novo sem dizer que a classificação ao lado dele ficou
   * congelada na rodada passada.
   */
  if (falhas.length > 0) {
    blocos.push(
      [
        `${MARCA.falha} <b>Parcialmente atualizado</b>`,
        ...falhas.map((f) => `• ${escaparHtml(f)}`),
      ].join("\n"),
    );
  }

  /**
   * A revalidação recusada é o caso traiçoeiro: o banco recebeu o dado novo e o
   * job "funcionou", mas o site segue servindo a versão velha do cache. Sem esta
   * linha o aviso mentiria por omissão — diria que o placar mudou enquanto o
   * torcedor ainda vê o antigo.
   */
  const rodape = revalidou
    ? `<i>${agoraEmFortaleza()} · cache do site renovado</i>`
    : `${MARCA.falha} <b>A revalidação do cache foi recusada</b> — o dado está no banco, mas o site pode seguir mostrando o anterior.`;

  return `${blocos.join("\n\n")}\n\n${rodape}`;
}
