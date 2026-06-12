import * as FileSystem from "expo-file-system/legacy";

const VERIFIED_FILE = `${FileSystem.documentDirectory}verifiedContacts.json`;

export const verifiedContactsStorage = {
  async getAll(): Promise<Record<string, string>> {
    const info = await FileSystem.getInfoAsync(VERIFIED_FILE);
    if (!info.exists) return {};
    try {
      const content = await FileSystem.readAsStringAsync(VERIFIED_FILE);
      const data = JSON.parse(content);
      return data && typeof data.verified === "object" ? data.verified : {};
    } catch {
      return {};
    }
  },

  async setAll(verified: Record<string, string>): Promise<void> {
    await FileSystem.writeAsStringAsync(VERIFIED_FILE, JSON.stringify({ verified }));
  },
};
