import { apiClient as api } from "./client";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  albumTitle: string | null;
  coverUrl: string | null;
  audioUrl: string;
  duration: number;
  genre: string | null;
  playCount: number;
  likeCount: number;
  uploader: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

export interface MusicPlaylist {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  _count?: { tracks: number };
}

export const musicApi = {
  getTrending() { return api.get<MusicTrack[]>("/music/trending").then((r) => r.data); },
  search(q: string) { return api.get<MusicTrack[]>("/music/search", { params: { q } }).then((r) => r.data); },
  upload(input: { title: string; artist: string; audioUrl: string; duration: number; albumTitle?: string; coverUrl?: string; genre?: string }) {
    return api.post<MusicTrack>("/music/tracks", input).then((r) => r.data);
  },
  play(trackId: string) { return api.post(`/music/tracks/${trackId}/play`); },
  toggleLike(trackId: string) { return api.post<{ liked: boolean }>(`/music/tracks/${trackId}/like`).then((r) => r.data); },
  deleteTrack(trackId: string) { return api.delete(`/music/tracks/${trackId}`); },
  getPlaylists() { return api.get<MusicPlaylist[]>("/music/playlists").then((r) => r.data); },
  createPlaylist(input: { name: string; description?: string; isPublic?: boolean }) {
    return api.post<MusicPlaylist>("/music/playlists", input).then((r) => r.data);
  },
  getPlaylistTracks(playlistId: string) { return api.get(`/music/playlists/${playlistId}/tracks`).then((r) => r.data); },
  addToPlaylist(playlistId: string, trackId: string) { return api.post(`/music/playlists/${playlistId}/tracks/${trackId}`); },
  removeFromPlaylist(playlistId: string, trackId: string) { return api.delete(`/music/playlists/${playlistId}/tracks/${trackId}`); },
};
