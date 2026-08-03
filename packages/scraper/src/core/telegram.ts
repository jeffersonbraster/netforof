import {
  enviarTelegram as enviar,
  type CredenciaisTelegram,
} from "@netfor/notificacoes";

export {
  agoraEmFortaleza,
  avisoDeFalha,
  cabecalho,
  escaparHtml,
  MARCA,
} from "@netfor/notificacoes";

/**
 * Ponte do scraper para o pacote de avisos.
 *
 * O pacote recebe as credenciais por parâmetro porque também roda no workerd,
 * onde `process.env` não existe. Aqui, em Node, elas vêm do ambiente do Actions —
 * e este arquivo é o único lugar do scraper que precisa saber disso.
 */
function credenciais(): CredenciaisTelegram {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat: process.env.TELEGRAM_CHAT_ID,
  };
}

export async function enviarTelegram(mensagem: string): Promise<boolean> {
  return enviar(mensagem, credenciais());
}
