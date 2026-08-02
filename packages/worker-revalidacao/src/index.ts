import { neon } from "@neondatabase/serverless";

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

async function buscarProximoKickoff(env: Env): Promise<Date | null> {
  const sql = neon(env.DATABASE_URL);
  const linhas = (await sql`
    SELECT kickoff_at FROM matches
    WHERE kickoff_at >= now()
    ORDER BY kickoff_at ASC
    LIMIT 1
  `) as Array<{ kickoff_at: string }>;

  const bruto = linhas[0]?.kickoff_at;
  return bruto ? new Date(bruto) : null;
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

/** Agenda o próximo despertar e grava. Devolve o instante gravado, para log. */
async function reagendar(env: Env): Promise<Date> {
  const kickoff = await buscarProximoKickoff(env);
  const esperarAte = kickoff
    ? new Date(kickoff.getTime() + DURACAO_DE_JOGO_MS)
    : new Date(Date.now() + ESPERA_SEM_AGENDA_MS);

  await env.ESTADO.put(CHAVE, esperarAte.toISOString());
  return esperarAte;
}

export default {
  async scheduled(_evento: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const guardado = await env.ESTADO.get(CHAVE);

    // Primeira execução (ou estado perdido): só agenda. Revalidar aqui seria
    // invalidar o site inteiro sem motivo — nada mudou desde o último jogo.
    if (!guardado) {
      const ate = await reagendar(env);
      console.log(`↷ Primeira execução — vigiando até ${ate.toISOString()}`);
      return;
    }

    const esperarAte = new Date(guardado);
    if (Number.isNaN(esperarAte.getTime())) {
      const ate = await reagendar(env);
      console.warn(`⚠ Estado ilegível ("${guardado}") — reagendado para ${ate.toISOString()}`);
      return;
    }

    if (Date.now() < esperarAte.getTime()) return;

    // O jogo acabou. Revalida ANTES de reagendar: se a revalidação falhar, o
    // estado fica como está e a próxima execução tenta de novo em 15 minutos.
    if (!(await revalidar(env))) return;

    const ate = await reagendar(env);
    console.log(`↻ Cache renovado após o jogo — próxima vigília até ${ate.toISOString()}`);
  },
};
