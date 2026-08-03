import { neon } from "@neondatabase/serverless";
import {
  agoraEmFortaleza,
  avisoDeFalha,
  cabecalho,
  enviarTelegram,
  escaparHtml,
  MARCA,
} from "@netfor/notificacoes";

/**
 * Vigia do "próximo jogo".
 *
 * ---------------------------------------------------------------------------
 * POR QUE ELE EXISTE
 * ---------------------------------------------------------------------------
 * O scraper (GitHub Actions) revalida o cache quando o BANCO muda — placar novo,
 * tabela nova. Esse guarda é o que segura o custo de KV: rodada sem novidade não
 * invalida nada.
 *
 * Só que existe uma mudança que não passa pelo banco: quando um jogo termina, o
 * "próximo jogo" do banner vira outro porque o RELÓGIO andou, não porque alguma
 * linha mudou. O scraper não tem como perceber isso, e o cache do site só se
 * renova de forma preguiçosa — no primeiro visitante depois do vencimento.
 *
 * Este worker fecha essa lacuna: ele sabe a que horas o jogo atual acaba e
 * revalida na hora certa, sem depender de visitante nem do Actions.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ELE NÃO REVALIDA DE HORA EM HORA
 * ---------------------------------------------------------------------------
 * Porque isso já quebrou este projeto uma vez. A tag `matches` é lida pelo
 * cabeçalho, que está em TODA página — invalidá-la derruba o site inteiro do
 * cache. Revalidação cega em cronograma fixo foi o que estourou a cota de
 * escrita do KV antes. Aqui ele age uma vez por jogo, e só.
 *
 * O ciclo normal é barato: uma leitura de KV por execução, nada mais. O banco só
 * é consultado quando um jogo realmente acabou — o que também evita acordar o
 * compute do Neon à toa, que é o recurso escasso do plano.
 */

interface Env {
  ESTADO: KVNamespace;
  DATABASE_URL: string;
  REVALIDATE_SECRET: string;
  SITE_URL: string;
  /**
   * Opcionais: sem eles o vigia continua funcionando, só fica mudo. Definir com
   * `wrangler secret put` — o worker não lê os secrets do GitHub.
   */
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

/** Credenciais no formato do pacote de avisos (que não conhece `process.env`). */
function avisos(env: Env) {
  return { token: env.TELEGRAM_BOT_TOKEN, chat: env.TELEGRAM_CHAT_ID };
}

const CHAVE = "vigia:proximo-jogo";

/**
 * Quanto tempo depois do apito inicial o jogo pode ser dado como encerrado.
 * 90 minutos de bola rolando, intervalo, acréscimos e a demora da fonte em
 * publicar o placar final. 2h30 erra para o lado seguro: revalidar cedo demais
 * mostraria o jogo em andamento como "próximo".
 */
const DURACAO_DE_JOGO_MS = 150 * 60 * 1000;

/** Sem jogo futuro na agenda, volta a olhar daqui a 12h em vez de a cada tique. */
const ESPERA_SEM_AGENDA_MS = 12 * 60 * 60 * 1000;

interface ProximoJogo {
  kickoff: Date;
  descricao: string;
}

async function buscarProximoJogo(env: Env): Promise<ProximoJogo | null> {
  const sql = neon(env.DATABASE_URL);
  const linhas = (await sql`
    SELECT kickoff_at, home_team, away_team, competition FROM matches
    WHERE kickoff_at >= now()
    ORDER BY kickoff_at ASC
    LIMIT 1
  `) as Array<{
    kickoff_at: string;
    home_team: string;
    away_team: string;
    competition: string;
  }>;

  const linha = linhas[0];
  if (!linha) return null;

  return {
    kickoff: new Date(linha.kickoff_at),
    descricao: `${linha.home_team} × ${linha.away_team} (${linha.competition})`,
  };
}

/** Data e hora no fuso do torcedor — UTC no aviso obrigaria conta de cabeça. */
function emFortaleza(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

async function revalidar(env: Env): Promise<boolean> {
  const resposta = await fetch(`${env.SITE_URL}/api/revalidate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-revalidate-secret": env.REVALIDATE_SECRET,
      "user-agent": "NetForBot/1.0 (+https://netfor.com.br)",
    },
    body: JSON.stringify({ tags: ["matches", "standings"] }),
  });

  if (!resposta.ok) {
    console.error(`✗ Revalidação recusada: HTTP ${resposta.status}`);
    return false;
  }
  return true;
}

/** Agenda o próximo despertar e grava. Devolve o que ficou agendado, para o log e o aviso. */
async function reagendar(env: Env): Promise<{ ate: Date; proximo: ProximoJogo | null }> {
  const proximo = await buscarProximoJogo(env);
  const esperarAte = proximo
    ? new Date(proximo.kickoff.getTime() + DURACAO_DE_JOGO_MS)
    : new Date(Date.now() + ESPERA_SEM_AGENDA_MS);

  await env.ESTADO.put(CHAVE, esperarAte.toISOString());
  return { ate: esperarAte, proximo };
}

/**
 * Marca de "já avisei desta falha".
 *
 * Sem ela, uma revalidação recusada geraria um alerta a cada 15 minutos — 96 por
 * dia até alguém intervir. A marca faz o primeiro alerta ser o único, e é
 * apagada quando volta a funcionar, para a próxima falha voltar a avisar.
 *
 * Escreve no KV só no caminho de falha, que é raro — o ciclo normal segue
 * custando uma leitura por execução.
 */
const CHAVE_FALHA = "vigia:falha-avisada";

async function avisarFalhaUmaVez(env: Env, mensagem: string): Promise<void> {
  if (await env.ESTADO.get(CHAVE_FALHA)) return;
  await env.ESTADO.put(CHAVE_FALHA, new Date().toISOString());
  await enviarTelegram(mensagem, avisos(env));
}

export default {
  async scheduled(_evento: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      const guardado = await env.ESTADO.get(CHAVE);

      // Primeira execução (ou estado perdido): só agenda. Revalidar aqui seria
      // invalidar o site inteiro sem motivo — nada mudou desde o último jogo.
      if (!guardado) {
        const { ate } = await reagendar(env);
        console.log(`↷ Primeira execução — vigiando até ${ate.toISOString()}`);
        return;
      }

      const esperarAte = new Date(guardado);
      if (Number.isNaN(esperarAte.getTime())) {
        const { ate } = await reagendar(env);
        console.warn(`⚠ Estado ilegível ("${guardado}") — reagendado para ${ate.toISOString()}`);
        return;
      }

      if (Date.now() < esperarAte.getTime()) return;

      // O jogo acabou. Revalida ANTES de reagendar: se a revalidação falhar, o
      // estado fica como está e a próxima execução tenta de novo em 15 minutos.
      if (!(await revalidar(env))) {
        await avisarFalhaUmaVez(
          env,
          avisoDeFalha(
            "Vigia do próximo jogo",
            "a revalidação do cache foi recusada",
            "O jogo acabou mas o site pode seguir anunciando a partida antiga como próxima. O vigia tenta de novo a cada 15 min; este alerta não se repete até voltar a funcionar.",
          ),
        );
        return;
      }

      const { ate, proximo } = await reagendar(env);
      console.log(`↻ Cache renovado após o jogo — próxima vigília até ${ate.toISOString()}`);

      // Voltou a funcionar: libera o alerta para a próxima falha.
      await env.ESTADO.delete(CHAVE_FALHA);

      /**
       * Este é o aviso que o vigia existe para dar. Ele dispara uma vez por
       * jogo — cerca de 1,6× por semana —, então não há risco de excesso, e é a
       * prova de que o banner virou sozinho depois do apito final.
       */
      await enviarTelegram(
        [
          cabecalho(MARCA.cache, "Vigia do próximo jogo", "cache renovado depois da partida"),
          "",
          proximo
            ? `Próximo: <b>${escaparHtml(proximo.descricao)}</b>\nEm ${escaparHtml(emFortaleza(proximo.kickoff))}`
            : "Nenhum jogo futuro na agenda — volto a olhar em 12h.",
          "",
          `<i>${agoraEmFortaleza()} · banner e números atualizados</i>`,
        ].join("\n"),
        avisos(env),
      );
    } catch (erro) {
      // Erro inesperado (Neon fora do ar, KV indisponível): sem este aviso, o
      // vigia morreria em silêncio e o sintoma só apareceria dias depois, como
      // banner parado.
      console.error("Erro no vigia:", erro);
      await avisarFalhaUmaVez(
        env,
        avisoDeFalha("Vigia do próximo jogo", erro, "Log: Cloudflare → Workers → netfor-revalidacao."),
      );
    }
  },
};
