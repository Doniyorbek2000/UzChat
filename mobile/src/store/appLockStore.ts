import { create } from "zustand";
import * as Crypto from "expo-crypto";
import { secureStorage } from "../storage/secureStorage";

interface AppLockState {
  isEnabled: boolean;
  isLocked: boolean;
  isReady: boolean;
  bootstrap: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  reset: () => Promise<void>;
}

function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export const useAppLockStore = create<AppLockState>((set, get) => ({
  isEnabled: false,
  isLocked: false,
  isReady: false,

  bootstrap: async () => {
    const hash = await secureStorage.getAppLockPinHash();
    set({ isEnabled: !!hash, isLocked: !!hash, isReady: true });
  },

  verifyPin: async (pin) => {
    const hash = await secureStorage.getAppLockPinHash();
    return !!hash && hash === (await hashPin(pin));
  },

  setPin: async (pin) => {
    await secureStorage.setAppLockPinHash(await hashPin(pin));
    set({ isEnabled: true });
  },

  removePin: async () => {
    await secureStorage.clearAppLockPinHash();
    set({ isEnabled: false });
  },

  unlock: async (pin) => {
    if (await get().verifyPin(pin)) {
      set({ isLocked: false });
      return true;
    }
    return false;
  },

  lock: () => {
    if (get().isEnabled) set({ isLocked: true });
  },

  reset: async () => {
    await secureStorage.clearAppLockPinHash();
    set({ isEnabled: false, isLocked: false, isReady: true });
  },
}));
