// Dados mockados da Fase 2 — substituídos por queries reais na Fase 4.
// Os shapes seguem o schema de packages/db.

export type MockArticle = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl: string | null;
  category: string;
  sourceName: string;
  publishedLabel: string;
  isHighlighted: boolean;
};

export type MockMatch = {
  id: number;
  competition: string;
  round: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  stadium: string;
  kickoffLabel: string;
  status: "scheduled" | "live" | "finished";
};

export type MockStanding = {
  position: number;
  teamName: string;
  points: number;
  played: number;
};

export type MockChant = {
  title: string;
  slug: string;
  category: "hino" | "canto";
  firstLine: string;
};

export const mockArticles: MockArticle[] = [
  {
    id: 1,
    title: "Fortaleza vence clássico e sobe na tabela do Brasileirão",
    slug: "fortaleza-vence-classico-e-sobe-na-tabela-do-brasileirao",
    excerpt:
      "Com gols no segundo tempo, o Leão do Pici confirmou o favoritismo no Castelão e ganhou posições na classificação.",
    imageUrl: "/netfor-banner.jpeg",
    category: "Brasileirão",
    sourceName: "ge",
    publishedLabel: "há 2 h",
    isHighlighted: true,
  },
  {
    id: 2,
    title: "Mercado da bola: Fortaleza encaminha contratação de atacante",
    slug: "mercado-da-bola-fortaleza-encaminha-contratacao-de-atacante",
    excerpt:
      "Diretoria do Tricolor do Pici avança em negociação e reforço pode chegar ainda nesta janela de transferências.",
    imageUrl: null,
    category: "Mercado da Bola",
    sourceName: "ge",
    publishedLabel: "há 4 h",
    isHighlighted: false,
  },
  {
    id: 3,
    title: "Vojvoda comenta preparação para duelo contra o Palmeiras",
    slug: "vojvoda-comenta-preparacao-para-duelo-contra-o-palmeiras",
    excerpt:
      "Treinador argentino destacou a semana cheia de treinos e a recuperação de atletas no departamento médico.",
    imageUrl: null,
    category: "Brasileirão",
    sourceName: "Diário do Nordeste",
    publishedLabel: "há 6 h",
    isHighlighted: false,
  },
  {
    id: 4,
    title: "Base do Leão: sub-20 goleia e avança no Campeonato Cearense",
    slug: "base-do-leao-sub-20-goleia-e-avanca-no-campeonato-cearense",
    excerpt:
      "Garotos do Pici fizeram 4 a 0 e garantiram vaga na próxima fase da competição estadual da categoria.",
    imageUrl: null,
    category: "Base",
    sourceName: "Fortaleza 1918",
    publishedLabel: "há 8 h",
    isHighlighted: false,
  },
  {
    id: 5,
    title: "Ingressos à venda para o próximo jogo no Castelão",
    slug: "ingressos-a-venda-para-o-proximo-jogo-no-castelao",
    excerpt:
      "Clube abriu vendas com promoção para sócios-torcedores; setores populares a partir de R$ 10.",
    imageUrl: null,
    category: "Clube",
    sourceName: "O Povo",
    publishedLabel: "há 10 h",
    isHighlighted: false,
  },
  {
    id: 6,
    title: "Leoas: Fortaleza feminino estreia com vitória no Brasileirão A2",
    slug: "leoas-fortaleza-feminino-estreia-com-vitoria-no-brasileirao-a2",
    excerpt:
      "Time feminino do Tricolor venceu fora de casa e larga na frente na briga pelo acesso à elite.",
    imageUrl: null,
    category: "Feminino",
    sourceName: "Sou Fortaleza",
    publishedLabel: "há 12 h",
    isHighlighted: false,
  },
  {
    id: 7,
    title: "Análise: o que muda no Fortaleza com o novo esquema de três zagueiros",
    slug: "analise-o-que-muda-no-fortaleza-com-o-novo-esquema",
    excerpt:
      "Números mostram evolução defensiva do Leão desde a mudança tática implementada nas últimas rodadas.",
    imageUrl: null,
    category: "Análise",
    sourceName: "ESPN",
    publishedLabel: "há 14 h",
    isHighlighted: false,
  },
  {
    id: 8,
    title: "Copa do Nordeste: definida a data das quartas de final do Leão",
    slug: "copa-do-nordeste-definida-a-data-das-quartas-de-final",
    excerpt:
      "CBF divulgou tabela detalhada e jogo decisivo do Fortaleza será no Castelão com mando tricolor.",
    imageUrl: null,
    category: "Copa do Nordeste",
    sourceName: "ge",
    publishedLabel: "há 16 h",
    isHighlighted: false,
  },
];

export const mockMatches: MockMatch[] = [
  {
    id: 1,
    competition: "Brasileirão",
    round: "Rodada 17",
    homeTeam: "Fortaleza",
    awayTeam: "Palmeiras",
    homeScore: null,
    awayScore: null,
    stadium: "Arena Castelão",
    kickoffLabel: "Dom, 03/08 · 16:00",
    status: "scheduled",
  },
  {
    id: 2,
    competition: "Copa do Nordeste",
    round: "Quartas de final",
    homeTeam: "Fortaleza",
    awayTeam: "Bahia",
    homeScore: null,
    awayScore: null,
    stadium: "Arena Castelão",
    kickoffLabel: "Qua, 06/08 · 21:30",
    status: "scheduled",
  },
  {
    id: 3,
    competition: "Brasileirão",
    round: "Rodada 18",
    homeTeam: "Flamengo",
    awayTeam: "Fortaleza",
    homeScore: null,
    awayScore: null,
    stadium: "Maracanã",
    kickoffLabel: "Dom, 10/08 · 18:30",
    status: "scheduled",
  },
  {
    id: 4,
    competition: "Brasileirão",
    round: "Rodada 16",
    homeTeam: "Fortaleza",
    awayTeam: "Ceará",
    homeScore: 2,
    awayScore: 0,
    stadium: "Arena Castelão",
    kickoffLabel: "Dom, 27/07",
    status: "finished",
  },
];

export const mockStandings: MockStanding[] = [
  { position: 1, teamName: "Flamengo", points: 37, played: 16 },
  { position: 2, teamName: "Palmeiras", points: 34, played: 16 },
  { position: 3, teamName: "Cruzeiro", points: 33, played: 16 },
  { position: 4, teamName: "Fortaleza", points: 30, played: 16 },
  { position: 5, teamName: "Bahia", points: 28, played: 16 },
  { position: 6, teamName: "Botafogo", points: 26, played: 16 },
];

export const mockChants: MockChant[] = [
  {
    title: "Hino do Fortaleza Esporte Clube",
    slug: "hino-do-fortaleza-esporte-clube",
    category: "hino",
    firstLine: "Fortaleza querido, Fortaleza adorado…",
  },
  {
    title: "Avante Leão",
    slug: "avante-leao",
    category: "canto",
    firstLine: "Avante Leão, a torcida tricolor te empurra…",
  },
  {
    title: "Sou Tricolor de Aço",
    slug: "sou-tricolor-de-acao",
    category: "canto",
    firstLine: "Sou tricolor de aço, sou de tanto amor…",
  },
];

export const mockMostRead: { title: string; slug: string; views: string }[] = [
  {
    title: "Fortaleza vence clássico e sobe na tabela do Brasileirão",
    slug: "fortaleza-vence-classico-e-sobe-na-tabela-do-brasileirao",
    views: "12,4 mil",
  },
  {
    title: "Mercado da bola: Fortaleza encaminha contratação de atacante",
    slug: "mercado-da-bola-fortaleza-encaminha-contratacao-de-atacante",
    views: "9,1 mil",
  },
  {
    title: "Vojvoda comenta preparação para duelo contra o Palmeiras",
    slug: "vojvoda-comenta-preparacao-para-duelo-contra-o-palmeiras",
    views: "7,8 mil",
  },
  {
    title: "Ingressos à venda para o próximo jogo no Castelão",
    slug: "ingressos-a-venda-para-o-proximo-jogo-no-castelao",
    views: "6,2 mil",
  },
  {
    title: "Copa do Nordeste: definida a data das quartas de final do Leão",
    slug: "copa-do-nordeste-definida-a-data-das-quartas-de-final",
    views: "5,0 mil",
  },
];
