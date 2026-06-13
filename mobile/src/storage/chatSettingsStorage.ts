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
};
