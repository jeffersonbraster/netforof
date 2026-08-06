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
  /**
   * Token de `workflow_dispatch`. Também opcional: sem ele o vigia segue
   * fazendo o que sempre fez, apenas sem acordar o Actions antes do jogo.
   */
  GITHUB_DISPATCH_TOKEN?: string;
  GITHUB_REPO: string;
  GITHUB_WORKFLOW: string;
}

/** Credenciais no formato do pacote de avisos (que não conhece `process.env`). */
function avisos(env: Env) {
  return { token: env.TELEGRAM_BOT_TOKEN, chat: env.TELEGRAM_CHAT_ID };
}

const CHAVE = "vigia:proximo-jogo";

/**
 * ---------------------------------------------------------------------------
 * DESPERTADOR DO ACTIONS
 * ---------------------------------------------------------------------------
 * O job de jogos do GitHub Actions tem cron de 30 min no arquivo, mas o GitHub
 * estrangula agendamento em repositório público: o intervalo real medido em
 * 05/08/2026 foi de 60 a 80 min, e num trecho passou de 2 horas.
 *
 * Isso não é detalhe. O script só entra de plantão se ALGUMA execução cair
 * dentro da janela do jogo — e quem decide a hora dessa execução é o GitHub,
 * não o cron. Foi o que fez a escalação de Fortaleza x Palmeiras não sair: a
 * última execução foi 45 min antes do apito, quando a ESPN ainda não tinha
 * publicado os onze, e a seguinte só veio com o jogo em andamento.
 *
 * O cron da Cloudflare, ao contrário, é confiável e roda de 15 em 15 min. Este
 * worker já sabe o horário do próximo jogo, então é o lugar certo para garantir
 * que exista uma execução do Actions começando antes do apito.
 *
 * 80 minutos de antecedência: cobre a publicação da escalação (30 a 60 min
 * antes) com folga para o runner subir, instalar dependências e chegar ao
 * plantão. Dispara UMA vez por jogo — a marca no KV é o que impede repetir a
 * cada 15 min, o que enfileiraria execução em cima de execução.
 */
const ANTECEDENCIA_DO_DISPARO_MS = 80 * 60 * 1000;

/** Apito do próximo jogo, gravado no reagendamento para o disparo não consultar o Neon. */
const CHAVE_KICKOFF = "vigia:proximo-kickoff";
/** Apito do jogo cujo disparo já foi feito. Sem isto, dispara a cada tique. */
const CHAVE_DISPARO = "vigia:disparo-feito";

async function dispararWorkflow(env: Env): Promise<boolean> {
  const resposta = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${env.GITHUB_WORKFLOW}/dispatches`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
        // A API do GitHub recusa requisição sem User-Agent.
        "user-agent": "NetForBot/1.0 (+https://netfor.com.br)",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );

  if (resposta.status === 204) return true;

  const corpo = await resposta.text().catch(() => "");
  console.error(`✗ workflow_dispatch recusado: HTTP ${resposta.status} ${corpo.slice(0, 200)}`);
  return false;
}

/**
 * Acorda o Actions se o próximo jogo está chegando e o disparo ainda não foi
 * feito. Só lê o KV — nada de banco, para manter o tique barato.
 */
async function acordarActionsSePreciso(env: Env): Promise<void> {
  if (!env.GITHUB_DISPATCH_TOKEN) return;

  const kickoffGuardado = await env.ESTADO.get(CHAVE_KICKOFF);
  if (!kickoffGuardado) return;

  const kickoff = new Date(kickoffGuardado);
  if (Number.isNaN(kickoff.getTime())) return;

  const abreEm = kickoff.getTime() - ANTECEDENCIA_DO_DISPARO_MS;
  // Depois do apito não adianta mais acordar ninguém por antecedência: se o job
  // caiu, o próprio cron do Actions retoma.
  if (Date.now() < abreEm || Date.now() > kickoff.getTime()) return;

  if ((await env.ESTADO.get(CHAVE_DISPARO)) === kickoffGuardado) return;

  if (await dispararWorkflow(env)) {
    // Grava DEPOIS do sucesso: disparo recusado precisa ser tentado de novo no
    // tique seguinte, e ainda restam ~5 tentativas dentro dos 80 min.
    await env.ESTADO.put(CHAVE_DISPARO, kickoffGuardado);
    console.log(`↑ Actions acordado para o jogo de ${kickoffGuardado}`);
    return;
  }

  /**
   * Token expirado é o desfecho mais provável aqui — o fino do GitHub tem prazo
   * de validade. Sem este aviso a degradação seria muda: o disparo pararia, o
   * job voltaria a depender do cron estrangulado, e o sintoma apareceria só
   * como escalação faltando num domingo. `avisarFalhaUmaVez` já garante que
   * isto não vire alerta de 15 em 15 minutos.
   */
  await avisarFalhaUmaVez(
    env,
    avisoDeFalha(
      "Despertador do Actions",
      "o GitHub recusou o workflow_dispatch",
      "Provavelmente o token expirou. Sem ele a escalação volta a depender do cron estrangulado do Actions e pode não sair. Gerar outro token fino com permissão Actions: read and write e atualizar o secret GH_DISPATCH_TOKEN no repositório.",
    ),
  );
}

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

  /**
   * O apito do próximo jogo fica gravado aqui para o despertador não precisar
   * consultar o Neon a cada 15 min — que é justamente o que este worker foi
   * desenhado para evitar. Sem jogo futuro, a chave é apagada: deixar a antiga
   * faria o despertador acordar o Actions para um jogo que já aconteceu.
   */
  if (proximo) {
    await env.ESTADO.put(CHAVE_KICKOFF, proximo.kickoff.toISOString());
  } else {
    await env.ESTADO.delete(CHAVE_KICKOFF);
  }

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

      /**
       * ANTES do retorno antecipado abaixo, e não depois: entre um jogo e o
       * seguinte o vigia passa quase todo o tempo em `Date.now() < esperarAte`,
       * que é exatamente a faixa onde o pré-jogo acontece. Depois do `return`
       * este código nunca rodaria.
       */
      await acordarActionsSePreciso(env);

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
