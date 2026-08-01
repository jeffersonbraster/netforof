import { ADSENSE_CLIENT } from "@/lib/ads";

/**
 * ads.txt — IAB Authorized Digital Sellers.
 *
 * Declara quem pode vender o inventário do domínio. Sem ele o AdSense marca o
 * site como "não autorizado" no relatório e boa parte dos anunciantes
 * programáticos simplesmente não dá lance — receita cai sem erro aparente.
 *
 * O conteúdo depende do publisher ID, então a rota só serve algo quando
 * `NEXT_PUBLIC_ADSENSE_CLIENT` existe. Antes disso devolve 404, que é honesto:
 * um ads.txt vazio ou com placeholder é pior que nenhum.
 */
export async function GET() {
  if (!ADSENSE_CLIENT) {
    return new Response("ads.txt indisponível: AdSense ainda não configurado.\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // `pub-XXXX` no formato exigido pela IAB (sem o prefixo "ca-").
  const publisherId = ADSENSE_CLIENT.replace(/^ca-/, "");

  // Registro na PRIMEIRA linha e tudo em ASCII puro. O comentário anterior
  // trazia um travessão (U+2014), que deixava a linha 1 fora do ASCII — a
  // especificação da IAB é texto simples, e não vale arriscar num arquivo cuja
  // única função é ser lido por um parser rígido.
  const linhas = [
    `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`,
    "# netfor.com.br - https://iabtechlab.com/ads-txt/",
    "",
  ].join("\n");

  return new Response(linhas, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
