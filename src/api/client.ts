import { API_BASE } from './config';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Team {
  teamID: number;
  teamName: string;
  shortName?: string;
  transferBudget: number;
  formation?: string;
  teamStyle?: string;
  youthFacilityLevel?: number;
  trainingFacilityLevel?: number;
  matchesPlayed?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  points?: number;
}

export interface SquadPlayer {
  playerID: number;
  name: string;
  position: string;
  overallRating: number;
  squadRole: 'Starter' | 'Bench' | string | null;
  squadPositionIndex?: number;
  isFatigued?: boolean;
  injuredWeeksRemaining?: number;
}

export interface MarketPlayer {
  playerID: number;
  name: string;
  position: string;
  overallRating: number;
  marketValue: number;
  currentTeam: string;
}

export interface StandingsEntry {
  teamID: number;
  teamName: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  goalDifference?: number;
  name?: string;
}

export interface Match {
  matchID: number;
  homeTeamID: number;
  awayTeamID: number;
  matchDate: string;
  homeGoals?: number;
  awayGoals?: number;
  played?: boolean;
  weekNumber?: number;
}

export interface MatchPreview {
  match: Match;
  homeTeam: { teamID: number; teamName: string; overallRating: number };
  awayTeam: { teamID: number; teamName: string; overallRating: number };
}

export interface FatigueStatus {
  fatigued: { playerID: number; name: string; position: string }[];
  injured: { playerID: number; name: string; position: string; weeksRemaining: number }[];
}

export interface Offer {
  offerId: number;
  fromTeamID: number;
  fromTeamName: string;
  targetPlayerID: number;
  targetPlayerName: string;
  targetPlayerOVR: number;
  targetPlayerPos: string;
  offerAmount: number;
  status: string;
}

export interface TrainingStatus {
  trainingProgramme: { position: string; matchesRemaining: number } | null;
}

// Multiplayer types
export interface FreeAgent {
  playerID: number;
  name: string;
  position: string;
  overallRating: number;
  marketValue: number;
}

export interface Bid {
  managerName: string;
  amount: number;
  timestamp: number;
}

export interface Auction {
  auctionId: number;
  playerId: number;
  playerName: string;
  playerPosition: string;
  playerOVR: number;
  playerMarketValue: number;
  startedBy: string;
  endTime: number;
  status: 'active' | 'completed';
  bids: Bid[];
  winnerId: string | null;
  winnerAmount: number | null;
}

export interface AuctionLeaguePlayer {
  managerName: string;
  budget: number;
}

export interface AuctionLeague {
  players: AuctionLeaguePlayer[];
  auctions: Auction[];
  signedPlayers: { playerId: number; playerName: string; signedBy: string; amount: number }[];
}

export interface MpPlayer {
  managerName: string;
  teamId: number;
  teamName: string;
  teamOVR: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  matchesPlayed: number;
  goalDifference: number;
}

export interface PendingInvite {
  inviteId: number;
  fromManager: string;
  toManager: string;
  fromTeamName: string;
  toTeamName: string;
  status: string;
}

export interface ActiveMatch {
  matchId: number;
  homeManager: string;
  awayManager: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeOVR?: number;
  awayOVR?: number;
  homeGoals?: number;
  awayGoals?: number;
  status: string;
}

export interface MpLeague {
  code: string;
  hostManagerName?: string;
  status: string;
  players: MpPlayer[];
  pendingInvites: PendingInvite[];
  activeMatches: ActiveMatch[];
}

// ── Request helper ─────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  managerName?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (managerName) {
    headers['x-manager-name'] = managerName;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `Request failed with status ${res.status}`) as any;
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return res.json() as Promise<T>;
}

// ── Game API ──────────────────────────────────────────────────────────────────

export const getTeams = (managerName: string) =>
  request<Team[]>('/teams', {}, managerName);

export const getLeagueStandings = (managerName: string) =>
  request<StandingsEntry[]>('/league/standings', {}, managerName);

export const getNextMatch = (teamId: number, managerName: string) =>
  request<Match & { message?: string }>(`/teams/${teamId}/next-match`, {}, managerName);

export const getTeamPlayers = (teamId: number, managerName: string) =>
  request<SquadPlayer[]>(`/teams/${teamId}/players`, {}, managerName);

export const getFatigueStatus = (teamId: number, managerName: string) =>
  request<FatigueStatus>(`/teams/${teamId}/fatigue-status`, {}, managerName);

export const getSchedule = (teamId: number, managerName: string) =>
  request<Match[]>(`/teams/${teamId}/schedule`, {}, managerName);

export const getTrainingStatus = (teamId: number, managerName: string) =>
  request<TrainingStatus>(`/teams/${teamId}/training`, {}, managerName);

export const getMatchPreview = (matchId: number, managerName: string) =>
  request<MatchPreview>(`/matches/${matchId}/preview`, {}, managerName);

export const getGameState = (managerName: string) =>
  request<any>('/game/state', {}, managerName);

export const loadGame = (managerName: string, gameState: any) =>
  request<{ message: string }>('/game/load', {
    method: 'POST',
    body: JSON.stringify({ managerName, gameState }),
  }, managerName);

export const getInbox = (managerName: string) =>
  request<Offer[]>('/transfers/inbox', {}, managerName);

export const getMarketPlayers = (managerName: string) =>
  request<MarketPlayer[]>('/transfers/market/all', {}, managerName);

export const saveLineup = (
  teamId: number,
  starters: number[],
  bench: number[],
  reserves: number[],
  teamOverallRating: number,
  managerName: string
) =>
  request<{ message: string }>(`/teams/${teamId}/lineup`, {
    method: 'PUT',
    body: JSON.stringify({ starters, bench, reserves, teamOverallRating }),
  }, managerName);

export const setTraining = (teamId: number, position: string, managerName: string) =>
  request<{ message: string; trainingProgramme?: { position: string; matchesRemaining: number } }>(
    `/teams/${teamId}/training`,
    { method: 'PUT', body: JSON.stringify({ position }) },
    managerName
  );

export const submitBid = (
  teamId: number,
  playerId: number,
  bidAmount: number,
  managerName: string
) =>
  request<{ message: string }>('/transfers/buy', {
    method: 'POST',
    body: JSON.stringify({ buyerTeamId: teamId, playerId, bidAmount }),
  }, managerName);

export const respondToOffer = (
  offerId: number,
  action: 'accept' | 'reject' | 'counter',
  counterAmount: number | undefined,
  managerName: string
) =>
  request<{ message: string }>('/transfers/inbox/respond', {
    method: 'POST',
    body: JSON.stringify({
      offerId,
      action,
      ...(counterAmount !== undefined && { counterAmount }),
    }),
  }, managerName);

export const upgradeFacility = (
  teamId: number,
  type: 'youth' | 'training',
  managerName: string
) =>
  request<{ message: string; newBudget: number; newLevel: number }>(
    `/teams/${teamId}/facilities/upgrade`,
    { method: 'POST', body: JSON.stringify({ type }) },
    managerName
  );

export const signYouthPlayer = (teamId: number, managerName: string) =>
  request<{ message: string; newBudget?: number; player?: any }>(
    `/teams/${teamId}/facilities/sign-youth`,
    { method: 'POST' },
    managerName
  );

export const simulateMatch = (
  matchId: number,
  homeTeamId: number,
  awayTeamId: number,
  homeGoals: number,
  awayGoals: number,
  managerName: string
) =>
  request<{ fatigueInfo?: { newFatigued: any[]; injuries: any[] } }>('/matches/simulate', {
    method: 'POST',
    body: JSON.stringify({ matchId, homeTeamId, awayTeamId, homeGoals, awayGoals }),
  }, managerName);

export const simulateWeek = (
  matchDate: string,
  excludeMatchId: number,
  managerName: string
) =>
  request<{ results: any[]; transferActivity: boolean; aiTransferSummary: string[] }>(
    '/matches/simulate-week',
    { method: 'POST', body: JSON.stringify({ matchDate, excludeMatchId }) },
    managerName
  );

// ── Multiplayer API ───────────────────────────────────────────────────────────

export const createLeague = (managerName: string) =>
  request<{ code: string }>('/mp/league/create', {
    method: 'POST',
    body: JSON.stringify({ managerName }),
  });

export const joinLeague = (code: string, managerName: string) =>
  request<{ message: string }>('/mp/league/join', {
    method: 'POST',
    body: JSON.stringify({ code, managerName }),
  });

export const getMpLeague = (code: string) =>
  request<MpLeague>(`/mp/league/${code}`);

export const getAuctionLeague = (code: string) =>
  request<AuctionLeague>(`/mp/league/${code}`);

export const selectTeam = (code: string, managerName: string, teamId: number) =>
  request<{ message: string }>(`/mp/league/${code}/select-team`, {
    method: 'POST',
    body: JSON.stringify({ managerName, teamId }),
  });

export const startLeague = (code: string, managerName: string) =>
  request<{ message: string }>(`/mp/league/${code}/start`, {
    method: 'POST',
    body: JSON.stringify({ managerName }),
  });

export const getFreeAgents = (code: string) =>
  request<FreeAgent[]>(`/mp/league/${code}/free-agents`);

export const startAuction = (code: string, managerName: string, agent: FreeAgent) =>
  request<{ message: string }>(`/mp/league/${code}/auction/start`, {
    method: 'POST',
    body: JSON.stringify({
      managerName,
      playerId: agent.playerID,
      playerName: agent.name,
      playerPosition: agent.position,
      playerOVR: agent.overallRating,
      playerMarketValue: agent.marketValue,
    }),
  });

export const placeBid = (
  code: string,
  auctionId: number,
  managerName: string,
  amount: number
) =>
  request<{ message: string }>(`/mp/league/${code}/auction/${auctionId}/bid`, {
    method: 'POST',
    body: JSON.stringify({ managerName, amount }),
  });

export const getMpMatch = (matchId: number, leagueCode: string) =>
  request<{ match: ActiveMatch }>(`/mp/matches/${matchId}?leagueCode=${leagueCode}`);

export const setMatchReady = (matchId: number, leagueCode: string, managerName: string) =>
  request<{ message: string }>(`/mp/matches/${matchId}/ready`, {
    method: 'POST',
    body: JSON.stringify({ leagueCode, managerName }),
  });

export const respondToMatchInvite = (
  leagueCode: string,
  inviteId: number,
  action: 'accept' | 'reject'
) =>
  request<{ matchId?: number; message?: string }>('/mp/matches/respond', {
    method: 'POST',
    body: JSON.stringify({ leagueCode, inviteId, action }),
  });

export const inviteToMatch = (
  leagueCode: string,
  fromManager: string,
  toManager: string
) =>
  request<{ message: string }>('/mp/matches/invite', {
    method: 'POST',
    body: JSON.stringify({ leagueCode, fromManager, toManager }),
  });
