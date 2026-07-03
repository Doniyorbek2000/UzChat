import { contactsService } from "../modules/contacts/contacts.service";
import { logger } from "../utils/logger";
import { scheduleExclusiveJob } from "../utils/jobLock";

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

let lastRunDate: string | null = null;

export function startBirthdayReminderJob() {
  const run = async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (today === lastRunDate) return;
    try {
      await contactsService.sendBirthdayReminders();
      lastRunDate = today;
    } catch (err) {
      logger.error("Birthday reminder job failed", { error: String(err) });
    }
  };
  scheduleExclusiveJob("birthday-reminders", CHECK_INTERVAL_MS, run, { immediate: true });
}
