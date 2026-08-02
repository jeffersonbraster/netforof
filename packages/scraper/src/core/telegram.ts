/**
 * Aviso no Telegram.
 *
 * Existe porque a fila de revisão é invisível: o scraper roda de hora em hora
 * no Actions e, sem aviso, só dá para saber que tem matéria esperando abrindo o
 * painel. O sentido do aviso é justamente não precisar abrir.
 *
 * Falhar aqui NUNCA derruba a rodada: a matéria já está gravada, e perder um
 * aviso é incômodo, não perda de dado. Por isso todo caminho de erro devolve
 * `false` em vez de lançar.
 */

const LIMITE_TELEGRAM = 4096;

/** O Telegram fecha a conexão em texto grande demais; cortar é melhor que 400. */
function cortar(texto: string): string {
  if (texto.length <= LIMITE_TELEGRAM) return texto;
  return `${texto.slice(0, LIMITE_TELEGRAM - 20)}\n\n… (cortado)`;
}

/**
 * `parse_mode: HTML` obriga escapar o texto do usuário. Título de matéria com
 * `&` ou `<` derruba a mensagem inteira com "can't parse entities" — e aí o
 * aviso some justamente quando havia algo para avisar.
 */
export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function enviarTelegram(mensagem: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chat) {
    console.warn("↷ TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID ausentes — aviso não enviado.");
    return false;
  }

  try {
    const resposta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: cortar(mensagem),
        parse_mode: "HTML",
        // Sem isto o Telegram abre um card gigante do primeiro link e a
        // mensagem vira um bloco de imagem no celular.
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (resposta.ok) {
      console.log("✉ Aviso enviado no Telegram.");
      return true;
    }

    // O corpo do erro do Telegram é específico e útil ("chat not found",
    // "bot was blocked by the user"). Sem ele o log diria só "HTTP 400".
    const corpo = await resposta.text().catch(() => "");
    console.error(`✗ Telegram recusou (HTTP ${resposta.status}): ${corpo.slice(0, 200)}`);
    return false;
  } catch (erro) {
    console.error(`✗ Telegram inacessível: ${erro instanceof Error ? erro.message : String(erro)}`);
    return false;
  }
}
