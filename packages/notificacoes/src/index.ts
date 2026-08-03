/**
 * Avisos no Telegram, compartilhados por todos os jobs do NETFOR.
 *
 * ---------------------------------------------------------------------------
 * POR QUE UM PACOTE, E NÃO UMA CÓPIA EM CADA LUGAR
 * ---------------------------------------------------------------------------
 * São três consumidores em dois runtimes diferentes: o scraper e o boletim
 * rodam em Node no GitHub Actions, o vigia roda em workerd na Cloudflare. Com
 * cópias, o escape de HTML e o corte de tamanho divergiriam com o tempo — e o
 * sintoma disso é o pior possível: o aviso some justamente quando havia algo
 * para avisar, porque um título com "&" derrubou a mensagem inteira.
 *
 * As credenciais entram por PARÂMETRO, nunca por `process.env` aqui dentro: no
 * workerd `process.env` não existe, os segredos chegam pelo `env` do handler.
 *
 * ---------------------------------------------------------------------------
 * A REGRA DE VOLUME
 * ---------------------------------------------------------------------------
 * Entre os três crons são ~160 execuções por dia (vigia a cada 15 min, jogos a
 * cada 30, scraper 16×). Avisar a cada execução é o caminho garantido para o bot
 * ser silenciado — e aí a falha real passa batida, que é exatamente o oposto do
 * que os avisos existem para fazer.
 *
 * A regra: avisa-se EVENTO, não execução.
 *   · sempre    — falha de job, e mudança de verdade (placar novo, cache
 *                 renovado, deploy)
 *   · nunca     — rodada que não mudou nada, que é a esmagadora maioria
 *   · 1× por dia— boletim com prova de frescor, para "está rodando?" ter
 *                 resposta sem depender de silêncio
 */

const LIMITE_TELEGRAM = 4096;

export interface CredenciaisTelegram {
  token: string | undefined;
  chat: string | undefined;
}

/** O Telegram fecha a conexão em texto grande demais; cortar é melhor que 400. */
function cortar(texto: string): string {
  if (texto.length <= LIMITE_TELEGRAM) return texto;
  return `${texto.slice(0, LIMITE_TELEGRAM - 20)}\n\n… (cortado)`;
}

/**
 * `parse_mode: HTML` obriga escapar o texto que vem de fora. Título de matéria
 * com `&` ou `<` derruba a mensagem inteira com "can't parse entities".
 */
export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Envia e devolve se conseguiu. NUNCA lança: perder um aviso é incômodo, perder
 * a rodada por causa de um aviso seria dano de verdade. Todo caminho de erro
 * devolve `false`.
 */
export async function enviarTelegram(
  mensagem: string,
  credenciais: CredenciaisTelegram,
): Promise<boolean> {
  const { token, chat } = credenciais;

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

/* -------------------------------------------------------------------------- */
/* Vocabulário visual dos avisos                                              */
/* -------------------------------------------------------------------------- */

/**
 * Um emoji por natureza de aviso, sempre o mesmo.
 *
 * Não é enfeite: é o que deixa a conversa escaneável no celular. Com dezenas de
 * mensagens acumuladas, o ✅ e o 🚨 são lidos na rolagem sem abrir nada — e é
 * essa leitura rápida que faz o aviso valer.
 */
export const MARCA = {
  falha: "🚨",
  jogos: "⚽",
  tabela: "📊",
  escalacao: "👥",
  cache: "♻️",
  deploy: "🚀",
  boletim: "📋",
  materia: "📝",
} as const;

/** Cabeçalho padrão: marca, nome do job em negrito, e o resumo na mesma linha. */
export function cabecalho(marca: string, job: string, resumo: string): string {
  return `${marca} <b>${escaparHtml(job)}</b> — ${escaparHtml(resumo)}`;
}

/**
 * Aviso de falha, com o mesmo formato em qualquer job.
 *
 * O `onde` precisa ser específico o bastante para abrir o log certo sem
 * adivinhar: "sync de jogos" não diz onde olhar, "matches.yml · syncStandings"
 * diz.
 */
export function avisoDeFalha(onde: string, erro: unknown, detalhe?: string): string {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return [
    cabecalho(MARCA.falha, onde, "falhou"),
    "",
    `<code>${escaparHtml(mensagem.slice(0, 500))}</code>`,
    detalhe ? `\n${escaparHtml(detalhe)}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

/** Data e hora no fuso do torcedor. UTC no aviso obrigaria conta de cabeça. */
export function agoraEmFortaleza(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}
