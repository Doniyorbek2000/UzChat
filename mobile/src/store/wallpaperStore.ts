import { create } from "zustand";
import { wallpaperStorage } from "../storage/wallpaperStorage";
import { DEFAULT_WALLPAPER_KEY } from "../theme/wallpapers";

interface WallpaperState {
  wallpapers: Record<string, string>;
  isReady: boolean;
  bootstrap: () => Promise<void>;
  getWallpaperId: (conversationId: string) => string;
  setWallpaper: (conversationId: string, wallpaperId: string) => Promise<void>;
}

export const useWallpaperStore = create<WallpaperState>((set, get) => ({
  wallpapers: {},
  isReady: false,

  bootstrap: async () => {
    const wallpapers = await wallpaperStorage.getAll();
    set({ wallpapers, isReady: true });
  },

  getWallpaperId: (conversationId) => {
    const { wallpapers } = get();
    return wallpapers[conversationId] ?? wallpapers[DEFAULT_WALLPAPER_KEY] ?? "standard";
  },

  setWallpaper: async (conversationId, wallpaperId) => {
    const wallpapers = { ...get().wallpapers, [conversationId]: wallpaperId };
    set({ wallpapers });
    await wallpaperStorage.setAll(wallpapers);
  },
}));
