/** Destinos do site, compartilhados pelo trilho do desktop e pelo menu mobile. */
export const LINKS_DE_SECAO = [
  { href: "/noticias", label: "Notícias" },
  { href: "/agenda", label: "Agenda" },
  { href: "/classificacao", label: "Classificação" },
  { href: "/videos", label: "Vídeos" },
  { href: "/cantos-da-torcida", label: "Cantos da Torcida" },
];

/** Casa por prefixo: /noticias/<slug> mantém "Notícias" marcado. */
export function estaAtivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
