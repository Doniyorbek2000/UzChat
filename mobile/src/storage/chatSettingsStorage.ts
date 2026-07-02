import * as FileSystem from "expo-file-system/legacy";

const SETTINGS_FILE = `${FileSystem.documentDirectory}chatSettings.json`;

async function readSettings(): Promise<Record<string, unknown>> {
  const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
  if (!info.exists) return {};
  try {
    return JSON.parse(await FileSystem.readAsStringAsync(SETTINGS_FILE));
  } catch {
    return {};
  }
}

async function writeSettings(patch: Record<string, unknown>): Promise<void> {
  const data = await readSettings();
  await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ ...data, ...patch }));
}

export const chatSettingsStorage = {
  async getFontScale(): Promise<number> {
    const data = await readSettings();
    return typeof data.fontScale === "number" ? data.fontScale : 1;
  },

  async setFontScale(fontScale: number): Promise<void> {
    await writeSettings({ fontScale });
  },

  async getAutoDownloadMedia(): Promise<boolean> {
    const data = await readSettings();
    return typeof data.autoDownloadMedia === "boolean" ? data.autoDownloadMedia : true;
  },

  async setAutoDownloadMedia(autoDownloadMedia: boolean): Promise<void> {
    await writeSettings({ autoDownloadMedia });
  },

  async getQuickReactionEmoji(): Promise<string> {
    const data = await readSettings();
    return typeof data.quickReactionEmoji === "string" && data.quickReactionEmoji.length > 0
      ? data.quickReactionEmoji
      : "❤️";
  },

  async setQuickReactionEmoji(quickReactionEmoji: string): Promise<void> {
    await writeSettings({ quickReactionEmoji });
  },

  // Telegram-style local retention: keep a local copy of messages others
  // delete, and the previous versions of messages they edit. Purely
  // client-side — the server (and the other side) is unaffected.
  async getKeepDeletedMessages(): Promise<boolean> {
    const data = await readSettings();
    return data.keepDeletedMessages === true;
  },

  async setKeepDeletedMessages(keepDeletedMessages: boolean): Promise<void> {
    await writeSettings({ keepDeletedMessages });
  },

  async getKeepEditHistory(): Promise<boolean> {
    const data = await readSettings();
    return data.keepEditHistory === true;
  },

  async setKeepEditHistory(keepEditHistory: boolean): Promise<void> {
    await writeSettings({ keepEditHistory });
  },
};
