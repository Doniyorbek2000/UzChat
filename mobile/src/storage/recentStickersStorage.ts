import * as FileSystem from "expo-file-system/legacy";

const RECENT_STICKERS_FILE = `${FileSystem.documentDirectory}recentStickers.json`;

export const recentStickersStorage = {
  async getRecent(): Promise<string[]> {
    const info = await FileSystem.getInfoAsync(RECENT_STICKERS_FILE);
    if (!info.exists) return [];
    try {
      const content = await FileSystem.readAsStringAsync(RECENT_STICKERS_FILE);
      const data = JSON.parse(content);
      return Array.isArray(data.stickers) ? data.stickers.filter((e: unknown) => typeof e === "string") : [];
    } catch {
      return [];
    }
  },

  async setRecent(stickers: string[]): Promise<void> {
    await FileSystem.writeAsStringAsync(RECENT_STICKERS_FILE, JSON.stringify({ stickers }));
  },
};
