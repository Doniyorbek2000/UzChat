import { usersService } from "../modules/users/users.service";
import { logger } from "../utils/logger";

const CHECK_INTERVAL_MS = 60 * 1000;

export function startCustomStatusExpiryJob() {
  setInterval(async () => {
    try {
      await usersService.clearExpiredCustomStatuses();
    } catch (err) {
      logger.error("Custom status expiry job failed", { error: String(err) });
    }
  }, CHECK_INTERVAL_MS);
}
