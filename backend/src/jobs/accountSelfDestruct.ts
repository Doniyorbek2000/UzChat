import { usersService } from "../modules/users/users.service";

// Checking once a day is enough since selfDestructDays granularity is in days.
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startAccountSelfDestructJob() {
  setInterval(async () => {
    try {
      await usersService.deleteInactiveAccounts();
    } catch (err) {
      console.error("Account self-destruct job failed:", err);
    }
  }, CHECK_INTERVAL_MS);
}
