import * as FileSystem from "expo-file-system/legacy";

const SETTINGS_FILE = `${FileSystem.documentDirectory}chatSettings.json`;

export const chatSettingsStorage = {
  async getFontScale(): Promise<number> {
    const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
    if (!info.exists) return 1;
    try {
      const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
      const data = JSON.parse(content);
      return typeof data.fontScale === "number" ? data.fontScale : 1;
    } catch {
      return 1;
    }
  },

  async setFontScale(fontScale: number): Promise<void> {
    await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ fontScale }));
  },
};
