import { z } from "zod";

export const updateFileSecuritySchema = z.object({
  blockExecutableFiles: z.boolean().optional(),
  blockAllFiles: z.boolean().optional(),
  blockMediaFromStrangers: z.boolean().optional(),
  maxFileSize: z.number().int().min(1024 * 1024).max(100 * 1024 * 1024).optional(),
  allowedFileTypes: z.array(z.string().max(10)).max(50).optional(),
  blockedFileTypes: z.array(z.string().max(10)).max(100).optional(),
  autoDownloadMedia: z.boolean().optional(),
  autoDownloadOnWifi: z.boolean().optional(),
  autoDownloadOnMobile: z.boolean().optional(),
});

export const checkFileSchema = z.object({
  recipientId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().max(100).optional(),
});

export type UpdateFileSecurityInput = z.infer<typeof updateFileSecuritySchema>;
export type CheckFileInput = z.infer<typeof checkFileSchema>;
