import * as FileSystem from "expo-file-system/legacy";

// Tracks which Discover services the user actually opens, so the screen can
// surface a personalised "recently used" row (WeChat-style) instead of the
// same static grid for everyone.

const RECENT_SERVICES_FILE = `${FileSystem.documentDirectory}recentServices.json`;
const MAX_RECENT = 8;

export const recentServicesStorage = {
  async getRecent(): Promise<string[]> {
    const info = await FileSystem.getInfoAsync(RECENT_SERVICES_FILE);
    if (!info.exists) return [];
    try {
      const data = JSON.parse(await FileSystem.readAsStringAsync(RECENT_SERVICES_FILE));
      return Array.isArray(data.keys) ? data.keys.filter((k: unknown) => typeof k === "string") : [];
    } catch {
      return [];
    }
  },

  /** Moves the service key to the front of the recents list. */
  async recordUse(key: string): Promise<string[]> {
    const current = await this.getRecent();
    const next = [key, ...current.filter((k) => k !== key)].slice(0, MAX_RECENT);
    await FileSystem.writeAsStringAsync(RECENT_SERVICES_FILE, JSON.stringify({ keys: next })).catch(() => {});
    return next;
  },
};
