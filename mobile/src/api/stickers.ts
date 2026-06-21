import { apiClient as api } from "./client";

export interface Sticker {
  id: string;
  packId: string;
  imageUrl: string;
  emoji: string | null;
  order: number;
}

export interface StickerPack {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isOfficial: boolean;
  isAnimated: boolean;
  installCount: number;
  stickers: Sticker[];
  creator: { id: string; username: string; displayName: string };
}

export const stickersApi = {
  list(query?: string) {
    return api.get<StickerPack[]>("/stickers", { params: { q: query } }).then((r) => r.data);
  },

  featured() {
    return api.get<StickerPack[]>("/stickers/featured").then((r) => r.data);
  },

  installed() {
    return api.get<StickerPack[]>("/stickers/installed").then((r) => r.data);
  },

  myPacks() {
    return api.get<StickerPack[]>("/stickers/mine").then((r) => r.data);
  },

  getPack(packId: string) {
    return api.get<StickerPack>(`/stickers/${packId}`).then((r) => r.data);
  },

  createPack(input: { name: string; description?: string; coverUrl?: string; isAnimated?: boolean }) {
    return api.post<StickerPack>("/stickers", input).then((r) => r.data);
  },

  addSticker(packId: string, input: { imageUrl: string; emoji?: string }) {
    return api.post<Sticker>(`/stickers/${packId}/stickers`, input).then((r) => r.data);
  },

  removeSticker(packId: string, stickerId: string) {
    return api.delete(`/stickers/${packId}/stickers/${stickerId}`);
  },

  install(packId: string) {
    return api.post(`/stickers/${packId}/install`);
  },

  uninstall(packId: string) {
    return api.delete(`/stickers/${packId}/install`);
  },

  deletePack(packId: string) {
    return api.delete(`/stickers/${packId}`);
  },
};
