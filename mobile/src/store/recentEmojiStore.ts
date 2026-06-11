import { create } from "zustand";
import { recentEmojiStorage } from "../storage/recentEmojiStorage";

export const DEFAULT_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const MAX_RECENT = 6;

interface RecentEmojiState {
  recentEmojis: string[];
  isReady: boolean;
  bootstrap: () => Promise<void>;
  recordEmoji: (emoji: string) => Promise<void>;
}

export const useRecentEmojiStore = create<RecentEmojiState>((set, get) => ({
  recentEmojis: DEFAULT_REACTION_EMOJIS,
  isReady: false,

  bootstrap: async () => {
    const stored = await recentEmojiStorage.getRecent();
    set({ recentEmojis: stored.length > 0 ? stored : DEFAULT_REACTION_EMOJIS, isReady: true });
  },

  recordEmoji: async (emoji) => {
    const next = [emoji, ...get().recentEmojis.filter((e) => e !== emoji)].slice(0, MAX_RECENT);
    set({ recentEmojis: next });
    await recentEmojiStorage.setRecent(next);
  },
}));
