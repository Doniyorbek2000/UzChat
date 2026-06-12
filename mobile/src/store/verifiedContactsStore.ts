import { create } from "zustand";
import { verifiedContactsStorage } from "../storage/verifiedContactsStorage";

interface VerifiedContactsState {
  // Maps userId -> the security code that was verified for that contact.
  verified: Record<string, string>;
  isReady: boolean;
  bootstrap: () => Promise<void>;
  setVerified: (userId: string, securityCode: string) => Promise<void>;
  removeVerified: (userId: string) => Promise<void>;
}

export const useVerifiedContactsStore = create<VerifiedContactsState>((set, get) => ({
  verified: {},
  isReady: false,

  bootstrap: async () => {
    const verified = await verifiedContactsStorage.getAll();
    set({ verified, isReady: true });
  },

  setVerified: async (userId, securityCode) => {
    const next = { ...get().verified, [userId]: securityCode };
    set({ verified: next });
    await verifiedContactsStorage.setAll(next);
  },

  removeVerified: async (userId) => {
    const next = { ...get().verified };
    delete next[userId];
    set({ verified: next });
    await verifiedContactsStorage.setAll(next);
  },
}));
