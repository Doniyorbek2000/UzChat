import { create } from "zustand";
import { chatSettingsStorage } from "../storage/chatSettingsStorage";

export const FONT_SCALES = [0.85, 1, 1.15, 1.3] as const;
export type FontScale = (typeof FONT_SCALES)[number];

interface ChatSettingsState {
  fontScale: FontScale;
  autoDownloadMedia: boolean;
  isReady: boolean;
  bootstrap: () => Promise<void>;
  setFontScale: (scale: FontScale) => Promise<void>;
  setAutoDownloadMedia: (value: boolean) => Promise<void>;
}

export const useChatSettingsStore = create<ChatSettingsState>((set) => ({
  fontScale: 1,
  autoDownloadMedia: true,
  isReady: false,

  bootstrap: async () => {
    const [fontScale, autoDownloadMedia] = await Promise.all([
      chatSettingsStorage.getFontScale(),
      chatSettingsStorage.getAutoDownloadMedia(),
    ]);
    set({
      fontScale: FONT_SCALES.includes(fontScale as FontScale) ? (fontScale as FontScale) : 1,
      autoDownloadMedia,
      isReady: true,
    });
  },

  setFontScale: async (scale) => {
    set({ fontScale: scale });
    await chatSettingsStorage.setFontScale(scale);
  },

  setAutoDownloadMedia: async (value) => {
    set({ autoDownloadMedia: value });
    await chatSettingsStorage.setAutoDownloadMedia(value);
  },
}));
