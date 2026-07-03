import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";
import { scheduleExclusiveJob } from "../utils/jobLock";

const INTERVAL_MS = 60 * 60 * 1000;
const STALE_HOURS = 24;

export function startNearbyCleanupJob() {
  const run = async () => {
    try {
      const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
      const result = await prisma.nearbyLocation.deleteMany({
        where: { updatedAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        logger.info("Cleaned stale nearby locations", { count: result.count });
      }
    } catch (err) {
      logger.error("Nearby cleanup job failed", { error: String(err) });
    }
  };
  scheduleExclusiveJob("nearby-cleanup", INTERVAL_MS, run, { immediate: true });
}
