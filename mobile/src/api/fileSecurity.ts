import { apiClient as api } from "./client";

export interface FileSecuritySettings {
  blockExecutableFiles: boolean;
  blockAllFiles: boolean;
  blockMediaFromStrangers: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  blockedFileTypes: string[];
  autoDownloadMedia: boolean;
  autoDownloadOnWifi: boolean;
  autoDownloadOnMobile: boolean;
}

export interface FileSecurityCheck {
  allowed: boolean;
  reason?: string;
  warning?: string;
}

export const fileSecurityApi = {
  getSettings() {
    return api.get<FileSecuritySettings>("/media/security/settings").then((r) => r.data);
  },

  updateSettings(input: Partial<FileSecuritySettings>) {
    return api.patch<FileSecuritySettings>("/media/security/settings", input).then((r) => r.data);
  },

  checkFile(input: { recipientId: string; filename: string; fileSize: number; mimeType?: string }) {
    return api.post<FileSecurityCheck>("/media/security/check", input).then((r) => r.data);
  },

  getDangerousTypes() {
    return api.get<{ extensions: string[] }>("/media/security/dangerous-types").then((r) => r.data);
  },
};
