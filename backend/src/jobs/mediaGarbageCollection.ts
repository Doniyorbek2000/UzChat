import { cleanupOrphanedUploads } from "../modules/media/upload";
import { logger } from "../utils/logger";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function startMediaGarbageCollectionJob() {
  setInterval(async () => {
    try {
      const removed = await cleanupOrphanedUploads();
      if (removed > 0) logger.info("Media GC completed", { removed });
    } catch (err) {
      logger.error("Media garbage collection job failed", { error: String(err) });
    }
  }, CHECK_INTERVAL_MS);
}
