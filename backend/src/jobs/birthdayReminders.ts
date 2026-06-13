import { contactsService } from "../modules/contacts/contacts.service";

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Runs once per UTC calendar day (tracked in-memory) and notifies users
// about contacts whose birthday falls on that day.
let lastRunDate: string | null = null;

export function startBirthdayReminderJob() {
  const run = async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (today === lastRunDate) return;
    lastRunDate = today;
    try {
      await contactsService.sendBirthdayReminders();
    } catch (err) {
      console.error("Birthday reminder job failed:", err);
    }
  };
  run();
  setInterval(run, CHECK_INTERVAL_MS);
}
