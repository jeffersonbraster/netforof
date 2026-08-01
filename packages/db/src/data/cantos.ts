/**
 * Catálogo de cantos e hinos.
 *
 * As LETRAS ficam neste arquivo, mantido pelo dono do portal — não são geradas
 * nem editadas pelo pipeline. Cada entrada precisa de `videoId` (YouTube) para
 * a página montar o player; sem ele a página mostra só a letra.
 *
 * TRIAGEM: faixas com discurso de ódio (slur por orientação sexual) ou palavrão
 * explícito ficam FORA deste arquivo. Não é curadoria estética — é requisito das
 * políticas do AdSense e do Google News, e no Brasil homofobia é equiparada a
 * racismo pela Lei 7.716/89 desde a decisão do STF de 2019. Ver README.
 */
export interface CantoSeed {
  title: string;
  slug: string;
  videoId: string;
  imageUrl: string | null;
  category: "hino" | "canto";
  order: number;
  lyrics: string;
}

/** Capa padrão do YouTube quando a faixa não tem arte própria. */
export function capaDoYoutube(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export const CANTOS: CantoSeed[] = [
  {
    title: "Hino do Fortaleza",
    slug: "hino-do-fortaleza",
    videoId: "4zxyxM0mv-I",
    imageUrl: null,
    category: "hino",
    order: 1,
    lyrics: "",
  },
  {
    title: "Fortaleza Eterno Amor",
    slug: "fortaleza-eterno-amor",
    videoId: "t19cPpi0qkk",
    imageUrl: null,
    category: "canto",
    order: 2,
    lyrics: "",
  },
  {
    title: "Quero Te Ver Campeão",
    slug: "quero-te-ver-campeao",
    videoId: "RPNS3ReHsdk",
    imageUrl: null,
    category: "canto",
    order: 3,
    lyrics: "",
  },
  {
    title: "Arê-Rê",
    slug: "are-re",
    videoId: "wXlXSz60QUU",
    imageUrl: null,
    category: "canto",
    order: 4,
    lyrics: "",
  },
  {
    title: "Dizem por Aí",
    slug: "dizem-por-ai",
    videoId: "lONQHJxqpZk",
    imageUrl: null,
    category: "canto",
    order: 5,
    lyrics: "",
  },
  {
    title: "A TUF Aê",
    slug: "a-tuf-ae",
    videoId: "IF-77KoOD5I",
    imageUrl: null,
    category: "canto",
    order: 6,
    lyrics: "",
  },
  {
    title: "Tricolor É Nós",
    slug: "tricolor-e-nos",
    videoId: "NAcOkTUBj8c",
    imageUrl: null,
    category: "canto",
    order: 7,
    lyrics: "",
  },
  {
    title: "Leão, Nós Gostamos de Você",
    slug: "leao-nos-gostamos-de-voce",
    videoId: "n8FDmVqw4OU",
    imageUrl: null,
    category: "canto",
    order: 8,
    lyrics: "",
  },
  {
    title: "Bateria da TUF",
    slug: "bateria-da-tuf",
    videoId: "QNn80pW6Auk",
    imageUrl: null,
    category: "canto",
    order: 9,
    lyrics: "",
  },
  {
    title: "Ver o Meu Leão",
    slug: "ver-o-meu-leao",
    videoId: "mM1p_wNpc8c",
    imageUrl: null,
    category: "canto",
    order: 10,
    lyrics: "",
  },
  {
    title: "Bate de Frente",
    slug: "bate-de-frente",
    videoId: "oTUUGl2-jkk",
    imageUrl: null,
    category: "canto",
    order: 11,
    lyrics: "",
  },
];
