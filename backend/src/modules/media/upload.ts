import crypto from "crypto";
import path from "path";
import multer from "multer";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import {
  storage,
  uploadsDir,
  removeByUrl,
  removeManyByUrl,
} from "../../services/storage.service";
import { ALLOWED_MIME_TYPES } from "./media.schema";

export { uploadsDir };

// Removes the given message media files, ignoring missing files. Used when
// whole conversations (and all their messages) are deleted.
export async function deleteUploadedFiles(mediaUrls: (string | null)[]) {
  await removeManyByUrl(mediaUrls);
}

// Removes a previously-uploaded avatar/cover file when it's replaced, but
// only if the URL actually points at our own storage (avoids touching
// anything for placeholder/external avatar URLs).
export async function deleteOwnUploadByUrl(url: string | null | undefined) {
  await removeByUrl(url);
}

// Safety net: removes stored files that aren't referenced by any
// message/avatar and are older than ORPHAN_AGE_MS (so files mid-upload, or
// awaiting a not-yet-committed sendMessage, are never touched). Catches
// uploads left behind by client send failures after a successful upload.
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

export async function cleanupOrphanedUploads() {
  const candidates = await storage.listOlderThan(Date.now() - ORPHAN_AGE_MS);
  let removed = 0;

  for (const candidate of candidates) {
    const basename = path.basename(candidate.name);
    const [msgRef, userRef, convRef] = await Promise.all([
      prisma.message.findFirst({ where: { mediaUrl: { endsWith: basename } }, select: { id: true } }),
      prisma.user.findFirst({ where: { avatarUrl: { endsWith: basename } }, select: { id: true } }),
      prisma.conversation.findFirst({ where: { avatarUrl: { endsWith: basename } }, select: { id: true } }),
    ]);
    if (msgRef || userRef || convRef) continue;

    await storage.remove(basename);
    removed++;
  }

  return removed;
}

function generateFilename(originalname: string): string {
  const ext = path.extname(originalname).toLowerCase().slice(0, 10);
  return `${crypto.randomUUID()}${ext}`;
}

// Local driver streams straight to disk; the s3 driver buffers in memory and
// finalizeUpload pushes the object to the store afterwards.
const multerStorage =
  env.storage.driver === "s3"
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadsDir),
        filename: (_req, file, cb) => cb(null, generateFilename(file.originalname)),
      });

// Persists an accepted upload and returns the client-facing URL.
export async function finalizeUpload(file: Express.Multer.File): Promise<{ url: string; size: number }> {
  if (env.storage.driver === "s3") {
    const filename = generateFilename(file.originalname);
    const url = await storage.save(file.buffer, filename, file.mimetype);
    return { url, size: file.size };
  }
  return { url: storage.publicUrl(file.filename), size: file.size };
}

// E2EE media blobs are pre-encrypted client-side, so the server only ever
// sees opaque ciphertext; a generous size limit covers photos/voice/video clips.
const allowedSet = new Set<string>(ALLOWED_MIME_TYPES);

export const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedSet.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
  },
});
