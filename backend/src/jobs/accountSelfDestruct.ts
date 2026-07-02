import { usersService } from "../modules/users/users.service";
import { logger } from "../utils/logger";
import { scheduleExclusiveJob } from "../utils/jobLock";

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startAccountSelfDestructJob() {
  scheduleExclusiveJob("account-self-destruct", CHECK_INTERVAL_MS, async () => {
    try {
      await usersService.deleteInactiveAccounts();
    } catch (err) {
      logger.error("Account self-destruct job failed", { error: String(err) });
    }
  });
}
