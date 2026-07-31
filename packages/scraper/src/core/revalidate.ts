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

export async function notifyRevalidate(tags: string[]): Promise<boolean> {
  const url = process.env.REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!url || !secret) {
    console.error(
      "✗ REVALIDATE_URL/REVALIDATE_SECRET não configurados — o site NÃO será atualizado.",
    );
    return false;
  }

  let ultimoErro = "";

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

      if (response.ok) {
        console.log(`↻ Cache revalidado (${tags.join(", ")}).`);
        return true;
      }

      ultimoErro = detalharResposta(response, await response.text().catch(() => ""));

      // 401 é segredo errado: repetir não resolve.
      if (response.status === 401) break;
    } catch (error) {
      ultimoErro = `inacessível: ${error instanceof Error ? error.message : String(error)}`;
    }

    if (tentativa < TENTATIVAS) {
      await new Promise((resolve) => setTimeout(resolve, ESPERA_MS * tentativa));
    }
  }

  console.error(`✗ Webhook de revalidação falhou em ${url} — ${ultimoErro}`);
  return false;
}
