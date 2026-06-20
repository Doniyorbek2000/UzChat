import { z } from "zod";

export const uploadResponseSchema = z.object({
  url: z.string().url(),
  size: z.number().int().positive(),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "application/pdf",
  "application/zip",
  "application/octet-stream",
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
