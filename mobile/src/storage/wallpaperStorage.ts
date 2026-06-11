import * as FileSystem from "expo-file-system/legacy";

const WALLPAPERS_FILE = `${FileSystem.documentDirectory}wallpapers.json`;

export const wallpaperStorage = {
  async getAll(): Promise<Record<string, string>> {
    const info = await FileSystem.getInfoAsync(WALLPAPERS_FILE);
    if (!info.exists) return {};
    try {
      const content = await FileSystem.readAsStringAsync(WALLPAPERS_FILE);
      return JSON.parse(content) as Record<string, string>;
    } catch {
      return {};
    }
  },

  async setAll(wallpapers: Record<string, string>): Promise<void> {
    await FileSystem.writeAsStringAsync(WALLPAPERS_FILE, JSON.stringify(wallpapers));
  },
};
