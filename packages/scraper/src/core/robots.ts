import { politeFetch } from "./http";

// Parser mínimo de robots.txt: coleta as regras Disallow do bloco User-agent: *
// (e de um eventual bloco NetForBot). Suficiente para checar caminhos antes do fetch.
const cache = new Map<string, string[]>();

async function getDisallowRules(origin: string): Promise<string[]> {
  const cached = cache.get(origin);
  if (cached) return cached;

  let rules: string[] = [];
  try {
    const response = await politeFetch(`${origin}/robots.txt`);
    if (response.ok) {
      const body = await response.text();
      let applies = false;
      for (const rawLine of body.split("\n")) {
        const line = rawLine.split("#")[0]?.trim() ?? "";
        if (!line) continue;
        const [key, ...rest] = line.split(":");
        const value = rest.join(":").trim();
        if (!key) continue;
        const lowerKey = key.trim().toLowerCase();
        if (lowerKey === "user-agent") {
          applies = value === "*" || value.toLowerCase().includes("netforbot");
        } else if (applies && lowerKey === "disallow" && value) {
          rules.push(value);
        }
      }
    }
  } catch {
    rules = [];
  }
  cache.set(origin, rules);
  return rules;
}

export async function isAllowedByRobots(url: string): Promise<boolean> {
  const { origin, pathname } = new URL(url);
  const rules = await getDisallowRules(origin);
  return !rules.some((rule) => pathname.startsWith(rule.replace(/\*$/, "")));
}
