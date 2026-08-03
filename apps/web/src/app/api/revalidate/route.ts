import { revalidateTag } from "next/cache";

const ALLOWED_TAGS = new Set(["articles", "chants", "lineups", "matches", "standings"]);

/**
 * Comparação em tempo constante: `!==` sai no primeiro byte diferente e vaza,
 * pelo tempo de resposta, quanto do segredo está certo. O custo de fazer certo
 * é irrisório, então não há motivo para deixar o canal lateral aberto.
 */
function segredoConfere(recebido: string | null, esperado: string | undefined): boolean {
  if (!recebido || !esperado || recebido.length !== esperado.length) return false;
  let diferenca = 0;
  for (let i = 0; i < recebido.length; i++) {
    diferenca |= recebido.charCodeAt(i) ^ esperado.charCodeAt(i);
  }
  return diferenca === 0;
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!segredoConfere(secret, process.env.REVALIDATE_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { tags?: unknown };
  const requested = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === "string") : [];
  const tags = (requested.length > 0 ? requested : ["articles"]).filter((tag) =>
    ALLOWED_TAGS.has(tag),
  );

  for (const tag of tags) {
    revalidateTag(tag, "max");
  }

  return Response.json({ revalidated: tags, at: new Date().toISOString() });
}
