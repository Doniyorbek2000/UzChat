import { messagesService } from "../modules/messages/messages.service";
import { getIo } from "../sockets";
import { pushService } from "../modules/push/push.service";
import { logger } from "../utils/logger";

const CHECK_INTERVAL_MS = 30 * 1000;

export function startMessageRemindersJob() {
  setInterval(async () => {
    try {
      const due = await messagesService.sendDueReminders();
      for (const { userId, conversationId, messageId } of due) {
        try {
          getIo().to(`user:${userId}`).emit("message:reminderDue", { conversationId, messageId });
          await pushService.sendToUsers([userId], {
            title: "Eslatma",
            body: "Yodga solgan xabaringizni ko'rib chiqing",
            data: { type: "message_reminder", conversationId, messageId },
          });
        } catch (err) {
          logger.error("Failed to deliver reminder", { messageId, userId, error: String(err) });
        }
      }
    } catch (err) {
      logger.error("Message reminders job failed", { error: String(err) });
    }
  }, CHECK_INTERVAL_MS);
}
