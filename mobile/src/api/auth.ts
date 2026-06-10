import { apiClient } from "./client";
import { AuthTokens, AuthUser } from "../types";

export const authApi = {
  requestRegisterOtp(phone: string) {
    return apiClient.post("/auth/register/request-otp", { phone });
  },

  verifyRegisterOtp(input: {
    phone: string;
    code: string;
    username: string;
    displayName: string;
    password: string;
    publicKey: string;
  }) {
    return apiClient
      .post<{ user: AuthUser } & AuthTokens>("/auth/register/verify-otp", input)
      .then((r) => r.data);
  },

  login(phone: string, password: string) {
    return apiClient.post<{ user: AuthUser } & AuthTokens>("/auth/login", { phone, password }).then((r) => r.data);
  },

  logout(refreshToken: string) {
    return apiClient.post("/auth/logout", { refreshToken });
  },
};
