import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import { API_URL } from "../config/env";
import { secureStorage } from "../storage/secureStorage";
import { isJwtExpired } from "../utils/jwt";

const isProduction = !__DEV__;
const effectiveUrl = isProduction && API_URL.startsWith("http://")
  ? API_URL.replace("http://", "https://")
  : API_URL;

export const apiClient = axios.create({
  baseURL: effectiveUrl,
  timeout: 30_000,
  headers: {
    "X-Client-Platform": Platform.OS,
    "X-Client-Version": "1.0.0",
  },
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

apiClient.interceptors.request.use(async (config) => {
  const { accessToken } = await secureStorage.getTokens();
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = await secureStorage.getTokens();
  if (!refreshToken) return null;

  try {
    const response = await axios.post(`${effectiveUrl}/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data;
    await secureStorage.setTokens(accessToken, newRefreshToken);
    return accessToken as string;
  } catch {
    await secureStorage.clearTokens();
    return null;
  }
}

/**
 * Returns a non-expired access token, refreshing it first if needed. Used by the
 * socket connection's auth handshake, which (unlike apiClient) has no response
 * interceptor to recover from an expired token after the fact.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const { accessToken } = await secureStorage.getTokens();
  if (accessToken && !isJwtExpired(accessToken)) return accessToken;
  refreshPromise ??= refreshAccessToken();
  const token = await refreshPromise;
  refreshPromise = null;
  return token;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 403) {
      const data = error.response.data as { error?: { message?: string } } | undefined;
      if (data?.error?.message?.includes("bloklangan")) {
        await secureStorage.clearTokens();
        onUnauthorized?.();
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      refreshPromise ??= refreshAccessToken();
      const newAccessToken = await refreshPromise;
      refreshPromise = null;

      if (newAccessToken) {
        original.headers.set("Authorization", `Bearer ${newAccessToken}`);
        return apiClient(original);
      }

      onUnauthorized?.();
    }

    return Promise.reject(error);
  }
);
