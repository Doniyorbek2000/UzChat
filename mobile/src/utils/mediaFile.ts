import * as FileSystem from "expo-file-system/legacy";
import { decodeBase64, encodeBase64 } from "tweetnacl-util";
import { API_URL } from "../config/env";
import { decryptBytes, encryptBytes } from "../crypto/e2ee";
import { secureStorage } from "../storage/secureStorage";

async function authHeaders(): Promise<Record<string, string>> {
  const { accessToken } = await secureStorage.getTokens();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

interface UploadResponse {
  url: string;
  size: number;
}

/** Uploads a local file as-is (e.g. a profile avatar), without E2EE. */
export async function uploadPlainFile(uri: string, mimeType: string): Promise<UploadResponse> {
  const headers = await authHeaders();
  const result = await FileSystem.uploadAsync(`${API_URL}/media/upload`, uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "file",
    mimeType,
    headers,
  });
  if (result.status >= 400) throw new Error("Faylni yuklab bo'lmadi");
  return JSON.parse(result.body) as UploadResponse;
}

/** Encrypts a local file with the conversation key and uploads the ciphertext. */
export async function encryptAndUploadFile(
  uri: string,
  conversationKey: string
): Promise<{ url: string; size: number; fileNonce: string }> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = decodeBase64(base64);
  const { ciphertext, nonce } = encryptBytes(bytes, conversationKey);

  const tmpUri = `${FileSystem.cacheDirectory}upload-${Date.now()}.enc`;
  await FileSystem.writeAsStringAsync(tmpUri, encodeBase64(ciphertext), { encoding: FileSystem.EncodingType.Base64 });

  try {
    const { url, size } = await uploadPlainFile(tmpUri, "application/octet-stream");
    return { url, size, fileNonce: nonce };
  } finally {
    await FileSystem.deleteAsync(tmpUri, { idempotent: true });
  }
}

/** Downloads an encrypted media file (if not already cached) and decrypts it to a local file URI. */
export async function downloadAndDecryptFile(
  url: string,
  fileNonce: string,
  conversationKey: string,
  cacheKey: string
): Promise<string> {
  const destUri = `${FileSystem.cacheDirectory}uzchat-${cacheKey}`;
  const info = await FileSystem.getInfoAsync(destUri);
  if (info.exists) return destUri;

  const encUri = `${FileSystem.cacheDirectory}uzchat-enc-${cacheKey}`;
  const headers = await authHeaders();
  await FileSystem.downloadAsync(url, encUri, { headers });

  try {
    const encBase64 = await FileSystem.readAsStringAsync(encUri, { encoding: FileSystem.EncodingType.Base64 });
    const encBytes = decodeBase64(encBase64);
    const bytes = decryptBytes(encBytes, fileNonce, conversationKey);
    await FileSystem.writeAsStringAsync(destUri, encodeBase64(bytes), { encoding: FileSystem.EncodingType.Base64 });
    return destUri;
  } finally {
    await FileSystem.deleteAsync(encUri, { idempotent: true });
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extensionFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot) : "";
}
