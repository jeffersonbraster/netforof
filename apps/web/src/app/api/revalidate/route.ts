import { revalidateTag } from "next/cache";

const ALLOWED_TAGS = new Set(["articles", "chants", "matches", "standings"]);

export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
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
