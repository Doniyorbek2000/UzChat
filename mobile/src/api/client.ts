import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_URL } from "../config/env";
import { secureStorage } from "../storage/secureStorage";

export const apiClient = axios.create({ baseURL: API_URL });

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
    const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data;
    await secureStorage.setTokens(accessToken, newRefreshToken);
    return accessToken as string;
  } catch {
    await secureStorage.clearTokens();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

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
