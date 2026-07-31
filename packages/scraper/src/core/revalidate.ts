/**
 * Webhook de revalidação do cache do Next.
 *
 * A falha aqui é silenciosa do ponto de vista do banco (os dados foram salvos),
 * mas fatal para o site: sem revalidar, o Worker continua servindo o cache
 * antigo. Por isso devolvemos o resultado e o chamador marca a run como falha —
 * caso contrário o Actions fica verde enquanto o portal congela.
 */

const TENTATIVAS = 3;
const ESPERA_MS = 3_000;

/**
 * Quem recusou a requisição? A rota `/api/revalidate` só devolve 401 (segredo
 * errado) ou 200. Qualquer 403/429/503 vem da borda da Cloudflare barrando o
 * IP do runner do Actions — diagnóstico completamente diferente. Sem esses
 * cabeçalhos o log só dizia "HTTP 403" e não dava para saber onde olhar.
 */
function detalharResposta(response: Response, corpo: string): string {
  const pistas = [
    `HTTP ${response.status}`,
    response.headers.get("cf-ray") && `cf-ray=${response.headers.get("cf-ray")}`,
    response.headers.get("cf-mitigated") && `cf-mitigated=${response.headers.get("cf-mitigated")}`,
    response.headers.get("server") && `server=${response.headers.get("server")}`,
  ].filter(Boolean);

  const trecho = corpo.replace(/\s+/g, " ").trim().slice(0, 200);
  return `${pistas.join(" ")}${trecho ? ` — corpo: ${trecho}` : ""}`;
}

/** Managed Challenge da Cloudflare: página "Just a moment...", que fetch não resolve. */
function ehDesafioCloudflare(response: Response): boolean {
  return response.status === 403 && response.headers.get("cf-mitigated") === "challenge";
}

type Resultado = { ok: true } | { ok: false; erro: string; desafiado: boolean };

async function tentarOrigem(url: string, secret: string, tags: string[]): Promise<Resultado> {
  let ultimoErro = "";
  let desafiado = false;

  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-revalidate-secret": secret,
          // Requisição sem UA é tratada como bot por vários CDNs.
          "user-agent": "NetForBot/1.0 (+https://netfor.com.br)",
        },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) return { ok: true };

      desafiado = ehDesafioCloudflare(response);
      ultimoErro = detalharResposta(response, await response.text().catch(() => ""));

      // Segredo errado ou desafio da borda não melhoram com insistência.
      if (response.status === 401 || desafiado) break;
    } catch (error) {
      ultimoErro = `inacessível: ${error instanceof Error ? error.message : String(error)}`;
    }

    if (tentativa < TENTATIVAS) {
      await new Promise((resolve) => setTimeout(resolve, ESPERA_MS * tentativa));
    }
  }

  return { ok: false, erro: ultimoErro, desafiado };
}

export async function notifyRevalidate(tags: string[]): Promise<boolean> {
  const url = process.env.REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!url || !secret) {
    console.error(
      "✗ REVALIDATE_URL/REVALIDATE_SECRET não configurados — o site NÃO será atualizado.",
    );
    return false;
  }

  const principal = await tentarOrigem(url, secret, tags);
  if (principal.ok) {
    console.log(`↻ Cache revalidado (${tags.join(", ")}).`);
    return true;
  }

  // A zona netfor.com.br desafia o IP do runner do Actions. O hostname
  // workers.dev do próprio Worker não passa pelas regras da zona, então serve de
  // rota de escape. Só é usado quando a borda de fato desafiou — quando o Bot
  // Fight Mode for desligado, este caminho nunca mais executa.
  const escape = process.env.REVALIDATE_FALLBACK_URL;
  if (principal.desafiado && escape) {
    console.warn(`⚠ Origem principal desafiada pela Cloudflare — tentando ${escape}`);
    const alternativa = await tentarOrigem(escape, secret, tags);
    if (alternativa.ok) {
      console.log(`↻ Cache revalidado via rota de escape (${tags.join(", ")}).`);
      return true;
    }
    console.error(`✗ Rota de escape também falhou — ${alternativa.erro}`);
  }

  console.error(`✗ Webhook de revalidação falhou em ${url} — ${principal.erro}`);
  return false;
}
