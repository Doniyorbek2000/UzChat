import { create } from "zustand";
import { chatSettingsStorage } from "../storage/chatSettingsStorage";

export const FONT_SCALES = [0.85, 1, 1.15, 1.3] as const;
export type FontScale = (typeof FONT_SCALES)[number];

interface ChatSettingsState {
  fontScale: FontScale;
  autoDownloadMedia: boolean;
  quickReactionEmoji: string;
  // Telegram-style local retention: keep messages the other side deletes and
  // previous versions of messages they edit. Client-side only.
  keepDeletedMessages: boolean;
  keepEditHistory: boolean;
  isReady: boolean;
  bootstrap: () => Promise<void>;
  setFontScale: (scale: FontScale) => Promise<void>;
  setAutoDownloadMedia: (value: boolean) => Promise<void>;
  setQuickReactionEmoji: (emoji: string) => Promise<void>;
  setKeepDeletedMessages: (value: boolean) => Promise<void>;
  setKeepEditHistory: (value: boolean) => Promise<void>;
}

export const useChatSettingsStore = create<ChatSettingsState>((set) => ({
  fontScale: 1,
  autoDownloadMedia: true,
  quickReactionEmoji: "❤️",
  keepDeletedMessages: false,
  keepEditHistory: false,
  isReady: false,

  bootstrap: async () => {
    const [fontScale, autoDownloadMedia, quickReactionEmoji, keepDeletedMessages, keepEditHistory] =
      await Promise.all([
        chatSettingsStorage.getFontScale(),
        chatSettingsStorage.getAutoDownloadMedia(),
        chatSettingsStorage.getQuickReactionEmoji(),
        chatSettingsStorage.getKeepDeletedMessages(),
        chatSettingsStorage.getKeepEditHistory(),
      ]);
    set({
      fontScale: FONT_SCALES.includes(fontScale as FontScale) ? (fontScale as FontScale) : 1,
      autoDownloadMedia,
      quickReactionEmoji,
      keepDeletedMessages,
      keepEditHistory,
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

  setKeepDeletedMessages: async (value) => {
    set({ keepDeletedMessages: value });
    await chatSettingsStorage.setKeepDeletedMessages(value);
  },

  setKeepEditHistory: async (value) => {
    set({ keepEditHistory: value });
    await chatSettingsStorage.setKeepEditHistory(value);
  },
}));
