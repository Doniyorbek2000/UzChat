import * as FileSystem from "expo-file-system/legacy";

const RECENT_FORWARD_TARGETS_FILE = `${FileSystem.documentDirectory}recentForwardTargets.json`;

export const recentForwardTargetsStorage = {
  async getRecent(): Promise<string[]> {
    const info = await FileSystem.getInfoAsync(RECENT_FORWARD_TARGETS_FILE);
    if (!info.exists) return [];
    try {
      const content = await FileSystem.readAsStringAsync(RECENT_FORWARD_TARGETS_FILE);
      const data = JSON.parse(content);
      return Array.isArray(data.targetIds) ? data.targetIds.filter((id: unknown) => typeof id === "string") : [];
    } catch {
      return [];
    }
  },

  async setRecent(targetIds: string[]): Promise<void> {
    await FileSystem.writeAsStringAsync(RECENT_FORWARD_TARGETS_FILE, JSON.stringify({ targetIds }));
  },
};
