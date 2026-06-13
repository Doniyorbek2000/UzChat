import { create } from "zustand";
import { quickRepliesStorage } from "../storage/quickRepliesStorage";

export interface QuickReply {
  id: string;
  text: string;
}

function makeId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

interface QuickRepliesState {
  quickReplies: QuickReply[];
  isReady: boolean;
  bootstrap: () => Promise<void>;
  addQuickReply: (text: string) => Promise<void>;
  updateQuickReply: (id: string, text: string) => Promise<void>;
  removeQuickReply: (id: string) => Promise<void>;
}

export const useQuickRepliesStore = create<QuickRepliesState>((set, get) => ({
  quickReplies: [],
  isReady: false,

  bootstrap: async () => {
    const quickReplies = await quickRepliesStorage.getAll();
    set({ quickReplies, isReady: true });
  },

  addQuickReply: async (text) => {
    const quickReplies = [...get().quickReplies, { id: makeId(), text }];
    set({ quickReplies });
    await quickRepliesStorage.setAll(quickReplies);
  },

  updateQuickReply: async (id, text) => {
    const quickReplies = get().quickReplies.map((q) => (q.id === id ? { ...q, text } : q));
    set({ quickReplies });
    await quickRepliesStorage.setAll(quickReplies);
  },

  removeQuickReply: async (id) => {
    const quickReplies = get().quickReplies.filter((q) => q.id !== id);
    set({ quickReplies });
    await quickRepliesStorage.setAll(quickReplies);
  },
}));
