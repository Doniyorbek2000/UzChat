import { apiClient as api } from "./client";

export interface ImportResult {
  phone: string;
  matched: boolean;
  userId?: string;
  displayName?: string;
}

export const contactImportApi = {
  sync(contacts: { phone: string; displayName?: string }[]) {
    return api.post<ImportResult[]>("/contact-import/sync", { contacts }).then((r) => r.data);
  },
  getMatched() { return api.get("/contact-import/matched").then((r) => r.data); },
  clear() { return api.delete("/contact-import/clear").then((r) => r.data); },
};
