import { apiClient as api } from "./client";

export interface CloudFileData {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  url: string;
  folderId: string | null;
  createdAt: string;
}

export interface CloudFolderData {
  id: string;
  name: string;
  parentId: string | null;
  _count?: { files: number; children: number };
  createdAt: string;
}

export interface CloudUsage {
  totalSize: number;
  fileCount: number;
}

export const cloudApi = {
  listFiles(folderId?: string) { return api.get<CloudFileData[]>("/cloud/files", { params: { folderId } }).then((r) => r.data); },
  listFolders(parentId?: string) { return api.get<CloudFolderData[]>("/cloud/folders", { params: { parentId } }).then((r) => r.data); },
  createFolder(name: string, parentId?: string) { return api.post<CloudFolderData>("/cloud/folders", { name, parentId }).then((r) => r.data); },
  uploadFile(input: { name: string; path: string; mimeType: string; size: number; url: string; folderId?: string }) {
    return api.post<CloudFileData>("/cloud/files", input).then((r) => r.data);
  },
  deleteFile(fileId: string) { return api.delete(`/cloud/files/${fileId}`); },
  deleteFolder(folderId: string) { return api.delete(`/cloud/folders/${folderId}`); },
  getUsage() { return api.get<CloudUsage>("/cloud/usage").then((r) => r.data); },
};
