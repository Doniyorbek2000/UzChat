import { messagesService } from "../modules/messages/messages.service";
import { getIo } from "../sockets";
import { logger } from "../utils/logger";

const CHECK_INTERVAL_MS = 10 * 1000;

export function startMessageExpiryJob() {
  setInterval(async () => {
    try {
      const expired = await messagesService.expireDueMessages();
      for (const message of expired) {
        getIo().to(`conversation:${message.conversationId}`).emit("message:deleted", message);
      }
    } catch (err) {
      logger.error("Message expiry job failed", { error: String(err) });
    }
  }, CHECK_INTERVAL_MS);
}
