/**
 * Filtro de pertinência ao clube.
 *
 * Existe por causa de uma ambiguidade cruel: "Fortaleza" é o clube E a cidade.
 * Em portal local (Diário do Nordeste, O Povo) e em portal nacional que cobre
 * várias praças, "Fortaleza" aparece em matéria de trânsito, polícia e cultura.
 * Publicar isso destruiria a proposta do site.
 *
 * A regra: precisa de sinal do CLUBE, e nenhum sinal de pauta de cidade.
 */

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Sinais de que a matéria é do clube. */
const SINAIS_DE_CLUBE = [
  "fortaleza ec",
  "fortaleza esporte clube",
  "leao do pici",
  "tricolor do pici",
  "tricolor de aco",
  "laion",
  "pici",
  "castelao",
  "serie b",
  "brasileirao",
  "copa do brasil",
  "copa do nordeste",
];

/** Pautas da CIDADE que nunca são do clube. */
const SINAIS_DE_CIDADE = [
  "prefeitura",
  "camara municipal",
  "transito",
  "assalto",
  "homicidio",
  "policia",
  "operacao policial",
  "chuva",
  "praia do futuro",
  "beira mar",
  "vereador",
  "secretaria de saude",
  "hospital",
  "aeroporto",
  "turismo",
  "carnaval",
];

export function ehDoClube(titulo: string, url = "", resumo = ""): boolean {
  const alvo = normalizar(`${titulo} ${resumo} ${decodeURIComponent(url)}`);

  if (SINAIS_DE_CIDADE.some((s) => alvo.includes(normalizar(s)))) return false;
  if (SINAIS_DE_CLUBE.some((s) => alvo.includes(normalizar(s)))) return true;

  // "Fortaleza" sozinho só passa junto de contexto esportivo — senão é cidade.
  const temFortaleza = alvo.includes("fortaleza");
  const contextoEsportivo =
    /\b(jogo|jogos|partida|gol|gols|tecnico|elenco|jogador|contrata|reforco|zagueiro|atacante|goleiro|meia|lateral|rodada|classificacao|treino|torcida|estadio|clube|futebol|placar|vitoria|derrota|empate|escalacao|sub-20|transfer|renova)\b/.test(
      alvo,
    );

  return temFortaleza && contextoEsportivo;
}
