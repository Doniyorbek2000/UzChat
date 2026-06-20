import crypto from "crypto";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import multer from "multer";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";

export const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const ownUploadPrefix = `${env.publicUrl}/media/`;

// Removes the given message media files from uploadsDir, ignoring missing
// files. Used when whole conversations (and all their messages) are deleted.
export async function deleteUploadedFiles(mediaUrls: (string | null)[]) {
  await Promise.all(
    mediaUrls
      .filter((url): url is string => !!url)
      .map((url) => fsPromises.unlink(path.join(uploadsDir, path.basename(url))).catch(() => {}))
  );
}

// Removes a previously-uploaded avatar/cover file when it's replaced, but
// only if the URL actually points at our own /media/ endpoint (avoids
// touching anything for placeholder/external avatar URLs).
export async function deleteOwnUploadByUrl(url: string | null | undefined) {
  if (!url || !url.startsWith(ownUploadPrefix)) return;
  await fsPromises.unlink(path.join(uploadsDir, path.basename(url))).catch(() => {});
}

// Safety net: removes files in uploadsDir that aren't referenced by any
// message/avatar and are older than ORPHAN_AGE_MS (so files mid-upload, or
// awaiting a not-yet-committed sendMessage, are never touched). Catches
// uploads left behind by client send failures after a successful upload.
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

export async function cleanupOrphanedUploads() {
  const [messages, users, conversations] = await Promise.all([
    prisma.message.findMany({ where: { mediaUrl: { not: null } }, select: { mediaUrl: true } }),
    prisma.user.findMany({ where: { avatarUrl: { not: null } }, select: { avatarUrl: true } }),
    prisma.conversation.findMany({ where: { avatarUrl: { not: null } }, select: { avatarUrl: true } }),
  ]);

  const referenced = new Set<string>();
  for (const { mediaUrl } of messages) if (mediaUrl) referenced.add(path.basename(mediaUrl));
  for (const { avatarUrl } of users) if (avatarUrl) referenced.add(path.basename(avatarUrl));
  for (const { avatarUrl } of conversations) if (avatarUrl) referenced.add(path.basename(avatarUrl));

  const files = await fsPromises.readdir(uploadsDir);
  const cutoff = Date.now() - ORPHAN_AGE_MS;
  let removed = 0;

  for (const file of files) {
    if (referenced.has(file)) continue;
    const filePath = path.join(uploadsDir, file);
    const stat = await fsPromises.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile() || stat.mtimeMs > cutoff) continue;
    await fsPromises.unlink(filePath).catch(() => {});
    removed++;
  }

  return removed;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

// E2EE media blobs are pre-encrypted client-side, so the server only ever
// sees opaque ciphertext; a generous size limit covers photos/voice/video clips.
export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});
