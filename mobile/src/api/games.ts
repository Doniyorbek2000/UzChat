import { apiClient as api } from "./client";

export interface GameData {
  id: string;
  title: string;
  description: string | null;
  iconUrl: string | null;
  url: string;
  category: string;
  playCount: number;
  rating: number;
  ratingCount: number;
  developer: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

export interface GameScore {
  id: string;
  score: number;
  playedAt: string;
  user: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

export const gamesApi = {
  getPopular() { return api.get<GameData[]>("/games/popular").then((r) => r.data); },
  getByCategory(category: string) { return api.get<GameData[]>(`/games/category/${category}`).then((r) => r.data); },
  getGame(gameId: string) { return api.get<GameData>(`/games/${gameId}`).then((r) => r.data); },
  create(input: { title: string; url: string; description?: string; iconUrl?: string; category?: string }) {
    return api.post<GameData>("/games", input).then((r) => r.data);
  },
  play(gameId: string) { return api.post(`/games/${gameId}/play`); },
  submitScore(gameId: string, score: number) { return api.post<GameScore>(`/games/${gameId}/score`, { score }).then((r) => r.data); },
  getLeaderboard(gameId: string) { return api.get<GameScore[]>(`/games/${gameId}/leaderboard`).then((r) => r.data); },
  getMyGames() { return api.get<GameData[]>("/games/mine").then((r) => r.data); },
};
