import { usersService } from "../modules/users/users.service";

const CHECK_INTERVAL_MS = 60 * 1000;

export function startCustomStatusExpiryJob() {
  setInterval(async () => {
    try {
      await usersService.clearExpiredCustomStatuses();
    } catch (err) {
      console.error("Custom status expiry job failed:", err);
    }
  }, CHECK_INTERVAL_MS);
}
