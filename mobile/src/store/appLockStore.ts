import { create } from "zustand";
import * as Crypto from "expo-crypto";
import { secureStorage } from "../storage/secureStorage";

interface AppLockState {
  isEnabled: boolean;
  isLocked: boolean;
  isReady: boolean;
  failedAttempts: number;
  lockedUntil: number;
  bootstrap: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  reset: () => Promise<void>;
  getRemainingLockSeconds: () => number;
}

function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

const LOCK_DELAYS = [0, 0, 0, 30_000, 60_000, 300_000];

export const useAppLockStore = create<AppLockState>((set, get) => ({
  isEnabled: false,
  isLocked: false,
  isReady: false,
  failedAttempts: 0,
  lockedUntil: 0,

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
    const { lockedUntil, failedAttempts } = get();
    if (Date.now() < lockedUntil) return false;

    if (await get().verifyPin(pin)) {
      set({ isLocked: false, failedAttempts: 0, lockedUntil: 0 });
      return true;
    }

    const newAttempts = failedAttempts + 1;
    const delayIdx = Math.min(newAttempts, LOCK_DELAYS.length - 1);
    const delay = LOCK_DELAYS[delayIdx];
    set({ failedAttempts: newAttempts, lockedUntil: delay ? Date.now() + delay : 0 });
    return false;
  },

  lock: () => {
    if (get().isEnabled) set({ isLocked: true });
  },

  reset: async () => {
    await secureStorage.clearAppLockPinHash();
    set({ isEnabled: false, isLocked: false, isReady: true, failedAttempts: 0, lockedUntil: 0 });
  },

  getRemainingLockSeconds: () => {
    const { lockedUntil } = get();
    return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
  },
}));
