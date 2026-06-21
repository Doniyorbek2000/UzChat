import { usersService } from "../modules/users/users.service";
import { logger } from "../utils/logger";

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startAccountSelfDestructJob() {
  setInterval(async () => {
    try {
      await usersService.deleteInactiveAccounts();
    } catch (err) {
      logger.error("Account self-destruct job failed", { error: String(err) });
    }
  }, CHECK_INTERVAL_MS);
}
