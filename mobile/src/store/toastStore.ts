import { create } from "zustand";

export interface ChatToast {
  conversationId: string;
  title: string;
  body: string;
  avatarUrl: string | null;
}

interface ToastState {
  toast: ChatToast | null;
  showToast: (toast: ChatToast) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (toast) => set({ toast }),
  hideToast: () => set({ toast: null }),
}));
