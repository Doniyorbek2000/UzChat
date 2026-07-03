import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { env } from "../config/env";
import { logger } from "../utils/logger";

// Media storage abstraction. The "local" driver keeps the original
// single-node disk behaviour; the "s3" driver works with any S3-compatible
// object store (MinIO, Cloudflare R2, AWS S3) so multiple backend replicas
// share the same media and a CDN can sit in front of downloads.

export const uploadsDir = path.join(process.cwd(), "uploads");
if (env.storage.driver === "local") {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export interface StoredObject {
  name: string;
  lastModifiedMs: number;
}

interface StorageDriver {
  save(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  remove(filename: string): Promise<void>;
  /** Returns a stream + metadata for proxying a download, or null if missing. */
  download(filename: string): Promise<{ stream: Readable; contentType?: string; contentLength?: number } | null>;
  /** Public URL the client should use to fetch this file. */
  publicUrl(filename: string): string;
  /** Lists stored objects older than the cutoff (for orphan GC). */
  listOlderThan(cutoffMs: number): Promise<StoredObject[]>;
}

const localDriver: StorageDriver = {
  async save(buffer, filename) {
    await fsPromises.writeFile(path.join(uploadsDir, path.basename(filename)), buffer);
    return this.publicUrl(filename);
  },

  async remove(filename) {
    await fsPromises.unlink(path.join(uploadsDir, path.basename(filename))).catch(() => {});
  },

  async download(filename) {
    const filePath = path.join(uploadsDir, path.basename(filename));
    const stat = await fsPromises.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) return null;
    return { stream: fs.createReadStream(filePath), contentLength: stat.size };
  },

  publicUrl(filename) {
    return `${env.publicUrl}/media/${path.basename(filename)}`;
  },

  async listOlderThan(cutoffMs) {
    const files = await fsPromises.readdir(uploadsDir);
    const result: StoredObject[] = [];
    for (const file of files) {
      const stat = await fsPromises.stat(path.join(uploadsDir, file)).catch(() => null);
      if (!stat || !stat.isFile() || stat.mtimeMs > cutoffMs) continue;
      result.push({ name: file, lastModifiedMs: stat.mtimeMs });
    }
    return result;
  },
};

// The AWS SDK is only loaded when the s3 driver is enabled, so local
// development and tests never touch it.
function createS3Driver(): StorageDriver {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } =
    require("@aws-sdk/client-s3") as typeof import("@aws-sdk/client-s3");

  const cfg = env.storage.s3;
  const client = new S3Client({
    region: cfg.region,
    ...(cfg.endpoint ? { endpoint: cfg.endpoint } : {}),
    forcePathStyle: cfg.forcePathStyle,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });

  return {
    async save(buffer, filename, mimeType) {
      await client.send(
        new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: path.basename(filename),
          Body: buffer,
          ContentType: mimeType,
          CacheControl: "private, max-age=31536000, immutable",
        })
      );
      return this.publicUrl(filename);
    },

    async remove(filename) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: path.basename(filename) }));
      } catch (err) {
        logger.warn("S3 delete failed", { filename, error: String(err) });
      }
    },

    async download(filename) {
      try {
        const res = await client.send(
          new GetObjectCommand({ Bucket: cfg.bucket, Key: path.basename(filename) })
        );
        if (!res.Body) return null;
        return {
          stream: res.Body as Readable,
          contentType: res.ContentType,
          contentLength: res.ContentLength,
        };
      } catch {
        return null;
      }
    },

    publicUrl(filename) {
      const base = cfg.publicUrl.replace(/\/$/, "");
      if (base) return `${base}/${path.basename(filename)}`;
      // No CDN/public bucket URL configured — downloads go through the API.
      return `${env.publicUrl}/media/${path.basename(filename)}`;
    },

    async listOlderThan(cutoffMs) {
      const result: StoredObject[] = [];
      let continuationToken: string | undefined;
      do {
        const res = await client.send(
          new ListObjectsV2Command({
            Bucket: cfg.bucket,
            ContinuationToken: continuationToken,
            MaxKeys: 1000,
          })
        );
        for (const obj of res.Contents ?? []) {
          const mtime = obj.LastModified?.getTime() ?? 0;
          if (obj.Key && mtime <= cutoffMs) {
            result.push({ name: obj.Key, lastModifiedMs: mtime });
          }
        }
        continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (continuationToken);
      return result;
    },
  };
}

export const storage: StorageDriver = env.storage.driver === "s3" ? createS3Driver() : localDriver;

const ownPrefixes = [
  `${env.publicUrl}/media/`,
  ...(env.storage.s3.publicUrl ? [`${env.storage.s3.publicUrl.replace(/\/$/, "")}/`] : []),
];

/** True when the URL points at a file we store ourselves (not an external avatar/placeholder). */
export function isOwnMediaUrl(url: string | null | undefined): url is string {
  return !!url && ownPrefixes.some((p) => url.startsWith(p));
}

/** Deletes a stored file by any of our own URLs; ignores external/missing URLs. */
export async function removeByUrl(url: string | null | undefined): Promise<void> {
  if (!isOwnMediaUrl(url)) return;
  await storage.remove(path.basename(url));
}

export async function removeManyByUrl(urls: (string | null)[]): Promise<void> {
  await Promise.all(urls.map((url) => removeByUrl(url)));
}
