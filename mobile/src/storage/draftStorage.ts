import * as FileSystem from "expo-file-system/legacy";

const DRAFTS_FILE = `${FileSystem.documentDirectory}drafts.json`;

export const draftStorage = {
  async getAll(): Promise<Record<string, string>> {
    const info = await FileSystem.getInfoAsync(DRAFTS_FILE);
    if (!info.exists) return {};
    try {
      const content = await FileSystem.readAsStringAsync(DRAFTS_FILE);
      return JSON.parse(content) as Record<string, string>;
    } catch {
      return {};
    }
  },

  async setAll(drafts: Record<string, string>): Promise<void> {
    await FileSystem.writeAsStringAsync(DRAFTS_FILE, JSON.stringify(drafts));
  },
};
