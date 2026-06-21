import { apiClient as api } from "./client";

export interface UploadResult {
  url: string;
  size: number;
}

export const mediaApi = {
  async upload(fileUri: string, fileName: string, mimeType: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const res = await api.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getMediaUrl(filename: string): string {
    return `${api.defaults.baseURL}/media/${filename}`;
  },
};
