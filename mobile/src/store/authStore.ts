import { create } from "zustand";
import { authApi } from "../api/auth";
import { usersApi } from "../api/users";
import { setUnauthorizedHandler } from "../api/client";
import { secureStorage } from "../storage/secureStorage";
import { generateKeyPair, KeyPair } from "../crypto/e2ee";
import { connectSocket, disconnectSocket } from "../socket/socket";
import { registerForPushNotificationsAsync, unregisterPushNotificationsAsync } from "../utils/pushNotifications";
import { useAppLockStore } from "./appLockStore";
import { AuthUser } from "../types";

interface AuthState {
  user: AuthUser | null;
  keyPair: KeyPair | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  bootstrap: () => Promise<void>;
  requestRegisterOtp: (phone: string) => Promise<void>;
  verifyRegisterOtp: (input: {
    phone: string;
    code: string;
    username: string;
    displayName: string;
    password: string;
  }) => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

async function ensureKeyPair(): Promise<KeyPair> {
  const existing = await secureStorage.getKeyPair();
  if (existing) return existing;
  const generated = generateKeyPair();
  await secureStorage.setKeyPair(generated.publicKey, generated.privateKey);
  return generated;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  keyPair: null,
  isLoading: true,
  isAuthenticated: false,

  bootstrap: async () => {
    set({ isLoading: true });
    setUnauthorizedHandler(() => {
      disconnectSocket();
      set({ user: null, isAuthenticated: false });
    });

    const { accessToken } = await secureStorage.getTokens();
    const keyPair = await secureStorage.getKeyPair();

    if (!accessToken) {
      set({ isLoading: false, keyPair });
      return;
    }

    try {
      const user = await usersApi.me();
      connectSocket(accessToken);
      set({ user, keyPair, isAuthenticated: true, isLoading: false });
      registerForPushNotificationsAsync().catch(() => {});
    } catch {
      set({ isLoading: false, keyPair });
    }
  },

  requestRegisterOtp: async (phone) => {
    await authApi.requestRegisterOtp(phone);
  },

  verifyRegisterOtp: async (input) => {
    const keyPair = await ensureKeyPair();
    const { user, accessToken, refreshToken } = await authApi.verifyRegisterOtp({
      ...input,
      publicKey: keyPair.publicKey,
    });
    await secureStorage.setTokens(accessToken, refreshToken);
    connectSocket(accessToken);
    set({ user, keyPair, isAuthenticated: true });
    registerForPushNotificationsAsync().catch(() => {});
  },

  login: async (phone, password) => {
    const keyPair = await ensureKeyPair();
    const { user, accessToken, refreshToken } = await authApi.login(phone, password);
    await secureStorage.setTokens(accessToken, refreshToken);
    connectSocket(accessToken);
    set({ user, keyPair, isAuthenticated: true });
    registerForPushNotificationsAsync().catch(() => {});
  },

  logout: async () => {
    await unregisterPushNotificationsAsync().catch(() => {});
    const { refreshToken } = await secureStorage.getTokens();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // best-effort revoke; clear local session regardless
      }
    }
    await secureStorage.clearTokens();
    await useAppLockStore.getState().reset();
    disconnectSocket();
    set({ user: null, isAuthenticated: false });
  },

  refreshProfile: async () => {
    if (!get().isAuthenticated) return;
    const user = await usersApi.me();
    set({ user });
  },
}));
