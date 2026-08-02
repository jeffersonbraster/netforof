/** Destinos do site, compartilhados pelo trilho do desktop e pelo menu mobile. */
export const LINKS_DE_SECAO = [
  { href: "/noticias", label: "Notícias" },
  { href: "/agenda", label: "Agenda" },
  { href: "/classificacao", label: "Classificação" },
  { href: "/videos", label: "Vídeos" },
  { href: "/cantos-da-torcida", label: "Cantos da Torcida" },
  /**
   * `destaque` chama atenção pelo 🔥, NUNCA por cor.
   *
   * A primeira versão pintava o item de vermelho o tempo todo — e o vermelho já
   * é o sinal de "você está aqui". Com o leitor em Notícias, dois itens ficavam
   * vermelhos e a marcação de rota perdia o sentido. Cor de estado tem que ter
   * um dono só.
   *
   * O emoji é `aria-hidden`: leitor de tela anunciaria "fogo", que não diz nada
   * sobre o destino.
   */
  { href: "/estatisticas", label: "Estatísticas", destaque: true },
] as const;

/** Casa por prefixo: /noticias/<slug> mantém "Notícias" marcado. */
export function estaAtivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
