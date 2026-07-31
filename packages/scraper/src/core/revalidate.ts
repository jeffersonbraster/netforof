/**
 * Webhook de revalidação do cache do Next.
 *
 * A falha aqui é silenciosa do ponto de vista do banco (os dados foram salvos),
 * mas fatal para o site: sem revalidar, o Worker continua servindo o cache
 * antigo. Por isso devolvemos o resultado e o chamador marca a run como falha —
 * caso contrário o Actions fica verde enquanto o portal congela.
 */
export async function notifyRevalidate(tags: string[]): Promise<boolean> {
  const url = process.env.REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!url || !secret) {
    console.error("✗ REVALIDATE_URL/REVALIDATE_SECRET não configurados — o site NÃO será atualizado.");
    return false;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags }),
    });

    if (!response.ok) {
      console.error(`✗ Webhook de revalidação retornou HTTP ${response.status} (${url}).`);
      return false;
    }

    console.log(`↻ Cache revalidado (${tags.join(", ")}).`);
    return true;
  } catch (error) {
    console.error(`✗ Webhook de revalidação inacessível (${url}):`, error);
    return false;
  }
}
