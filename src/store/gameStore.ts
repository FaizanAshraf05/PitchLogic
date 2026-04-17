import { create } from 'zustand';

export interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  overall: number;
  age: number;
  stamina: number;
  morale: number;
}

export interface TeamStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  players: Player[];
  stats: TeamStats;
  budget: number;
}

export interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  matchday: number;
}

interface GameState {
  isGameStarted: boolean;
  currentSeason: number;
  currentMatchday: number;
  userTeam: Team | null;
  teams: Team[];
  matchResults: MatchResult[];
  startNewGame: (teamName: string) => void;
  resetGame: () => void;
}

const createDefaultStats = (): TeamStats => ({
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  points: 0,
});

export const useGameStore = create<GameState>((set) => ({
  isGameStarted: false,
  currentSeason: 1,
  currentMatchday: 1,
  userTeam: null,
  teams: [],
  matchResults: [],

  startNewGame: (teamName: string) => {
    const userTeam: Team = {
      id: 'user-team',
      name: teamName,
      shortName: teamName.substring(0, 3).toUpperCase(),
      players: [],
      stats: createDefaultStats(),
      budget: 50000000,
    };

    set({
      isGameStarted: true,
      currentSeason: 1,
      currentMatchday: 1,
      userTeam,
      teams: [userTeam],
      matchResults: [],
    });
  },

  resetGame: () => {
    set({
      isGameStarted: false,
      currentSeason: 1,
      currentMatchday: 1,
      userTeam: null,
      teams: [],
      matchResults: [],
    });
  },
}));
