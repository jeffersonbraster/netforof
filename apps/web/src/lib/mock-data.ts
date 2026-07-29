// Dados mockados de jogos/classificação — substituídos na Fase 5 (API-Football).

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
