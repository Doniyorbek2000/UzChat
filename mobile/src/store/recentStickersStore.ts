import { create } from "zustand";
import { recentStickersStorage } from "../storage/recentStickersStorage";

const MAX_RECENT_STICKERS = 16;

interface RecentStickersState {
  recentStickers: string[];
  isReady: boolean;
  bootstrap: () => Promise<void>;
  recordSticker: (sticker: string) => Promise<void>;
}

export const useRecentStickersStore = create<RecentStickersState>((set, get) => ({
  recentStickers: [],
  isReady: false,

  bootstrap: async () => {
    const stored = await recentStickersStorage.getRecent();
    set({ recentStickers: stored, isReady: true });
  },

  recordSticker: async (sticker) => {
    const next = [sticker, ...get().recentStickers.filter((s) => s !== sticker)].slice(0, MAX_RECENT_STICKERS);
    set({ recentStickers: next });
    await recentStickersStorage.setRecent(next);
  },
}));
