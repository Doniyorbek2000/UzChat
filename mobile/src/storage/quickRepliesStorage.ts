import * as FileSystem from "expo-file-system/legacy";
import { QuickReply } from "../store/quickRepliesStore";

const QUICK_REPLIES_FILE = `${FileSystem.documentDirectory}quickReplies.json`;

export const quickRepliesStorage = {
  async getAll(): Promise<QuickReply[]> {
    const info = await FileSystem.getInfoAsync(QUICK_REPLIES_FILE);
    if (!info.exists) return [];
    try {
      const content = await FileSystem.readAsStringAsync(QUICK_REPLIES_FILE);
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async setAll(quickReplies: QuickReply[]): Promise<void> {
    await FileSystem.writeAsStringAsync(QUICK_REPLIES_FILE, JSON.stringify(quickReplies));
  },
};
