import * as FileSystem from "expo-file-system/legacy";

const RECENT_EMOJI_FILE = `${FileSystem.documentDirectory}recentEmojis.json`;

export const recentEmojiStorage = {
  async getRecent(): Promise<string[]> {
    const info = await FileSystem.getInfoAsync(RECENT_EMOJI_FILE);
    if (!info.exists) return [];
    try {
      const content = await FileSystem.readAsStringAsync(RECENT_EMOJI_FILE);
      const data = JSON.parse(content);
      return Array.isArray(data.emojis) ? data.emojis.filter((e: unknown) => typeof e === "string") : [];
    } catch {
      return [];
    }
  },

  async setRecent(emojis: string[]): Promise<void> {
    await FileSystem.writeAsStringAsync(RECENT_EMOJI_FILE, JSON.stringify({ emojis }));
  },
};
