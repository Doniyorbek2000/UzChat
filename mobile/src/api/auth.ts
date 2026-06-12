import { apiClient } from "./client";
import { AuthTokens, AuthUser, LoginResult, Session } from "../types";

export const authApi = {
  checkUsername(username: string) {
    return apiClient
      .get<{ available: boolean }>("/auth/check-username", { params: { username } })
      .then((r) => r.data.available);
  },

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
    return apiClient.post<LoginResult>("/auth/login", { phone, password }).then((r) => r.data);
  },

  verifyTwoFactor(pendingToken: string, password: string) {
    return apiClient
      .post<{ user: AuthUser } & AuthTokens>("/auth/login/2fa", { pendingToken, password })
      .then((r) => r.data);
  },

  logout(refreshToken: string) {
    return apiClient.post("/auth/logout", { refreshToken });
  },

  listSessions() {
    return apiClient.get<Session[]>("/auth/sessions").then((r) => r.data);
  },

  revokeSession(id: string) {
    return apiClient.delete(`/auth/sessions/${id}`);
  },

  revokeOtherSessions() {
    return apiClient.post("/auth/sessions/revoke-others");
  },
};
