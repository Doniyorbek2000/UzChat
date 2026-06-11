import { messagesService } from "../modules/messages/messages.service";
import { getIo } from "../sockets";

const CHECK_INTERVAL_MS = 10 * 1000;

export function startScheduledMessagesJob() {
  setInterval(async () => {
    try {
      const published = await messagesService.publishDueScheduledMessages();
      for (const message of published) {
        getIo().to(`conversation:${message.conversationId}`).emit("message:new", message);
      }
    } catch (err) {
      console.error("Scheduled messages job failed:", err);
    }
  }, CHECK_INTERVAL_MS);
}
