import crypto from "crypto";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import multer from "multer";
import { env } from "../../config/env";

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
