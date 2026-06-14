import { create } from "zustand";
import { chatSettingsStorage } from "../storage/chatSettingsStorage";

export const FONT_SCALES = [0.85, 1, 1.15, 1.3] as const;
export type FontScale = (typeof FONT_SCALES)[number];

interface ChatSettingsState {
  fontScale: FontScale;
  autoDownloadMedia: boolean;
  quickReactionEmoji: string;
  isReady: boolean;
  bootstrap: () => Promise<void>;
  setFontScale: (scale: FontScale) => Promise<void>;
  setAutoDownloadMedia: (value: boolean) => Promise<void>;
  setQuickReactionEmoji: (emoji: string) => Promise<void>;
}

export const useChatSettingsStore = create<ChatSettingsState>((set) => ({
  fontScale: 1,
  autoDownloadMedia: true,
  quickReactionEmoji: "❤️",
  isReady: false,

  bootstrap: async () => {
    const [fontScale, autoDownloadMedia, quickReactionEmoji] = await Promise.all([
      chatSettingsStorage.getFontScale(),
      chatSettingsStorage.getAutoDownloadMedia(),
      chatSettingsStorage.getQuickReactionEmoji(),
    ]);
    set({
      fontScale: FONT_SCALES.includes(fontScale as FontScale) ? (fontScale as FontScale) : 1,
      autoDownloadMedia,
      quickReactionEmoji,
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

  setQuickReactionEmoji: async (emoji) => {
    set({ quickReactionEmoji: emoji });
    await chatSettingsStorage.setQuickReactionEmoji(emoji);
  },
}));
