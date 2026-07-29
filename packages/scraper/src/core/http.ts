const USER_AGENT = "NetForBot/1.0 (+https://netfor.club)";
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const MIN_INTERVAL_PER_DOMAIN_MS = 1_000;

// Fila por domínio: garante no máximo 1 req/s em cada portal (boa vizinhança).
const domainQueues = new Map<string, Promise<void>>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttleDomain(url: string): Promise<void> {
  const domain = new URL(url).hostname;
  const previous = domainQueues.get(domain) ?? Promise.resolve();
  const next = previous.then(() => sleep(MIN_INTERVAL_PER_DOMAIN_MS));
  domainQueues.set(domain, next);
  await previous;
}

export async function politeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  await throttleDomain(url);

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(500 * 2 ** attempt);
    }
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
          ...init.headers,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        lastError = new Error(`HTTP ${response.status} em ${url}`);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Falha ao buscar ${url}`);
}

export async function fetchText(url: string): Promise<string> {
  const response = await politeFetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} em ${url}`);
  }
  return response.text();
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await politeFetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} em ${url}`);
  }
  return response.json() as Promise<T>;
}
