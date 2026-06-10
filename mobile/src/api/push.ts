import { apiClient } from "./client";

export const pushApi = {
  registerToken(token: string) {
    return apiClient.post("/push/token", { token });
  },

  unregisterToken(token: string) {
    return apiClient.delete("/push/token", { data: { token } });
  },
};
