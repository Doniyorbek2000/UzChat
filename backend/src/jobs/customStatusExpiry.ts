import { usersService } from "../modules/users/users.service";
import { logger } from "../utils/logger";
import { scheduleExclusiveJob } from "../utils/jobLock";

const CHECK_INTERVAL_MS = 60 * 1000;

export function startCustomStatusExpiryJob() {
  scheduleExclusiveJob("custom-status-expiry", CHECK_INTERVAL_MS, async () => {
    try {
      await usersService.clearExpiredCustomStatuses();
    } catch (err) {
      logger.error("Custom status expiry job failed", { error: String(err) });
    }
  });
}
