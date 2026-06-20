import { cleanupOrphanedUploads } from "../modules/media/upload";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function startMediaGarbageCollectionJob() {
  setInterval(async () => {
    try {
      const removed = await cleanupOrphanedUploads();
      if (removed > 0) console.log(`Media GC: removed ${removed} orphaned upload(s)`);
    } catch (err) {
      console.error("Media garbage collection job failed:", err);
    }
  }, CHECK_INTERVAL_MS);
}
