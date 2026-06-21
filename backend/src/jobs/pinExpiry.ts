import { chatsService } from "../modules/chats/chats.service";
import { getIo } from "../sockets";
import { logger } from "../utils/logger";

const CHECK_INTERVAL_MS = 60 * 1000;

export function startPinExpiryJob() {
  setInterval(async () => {
    try {
      const expired = await chatsService.unpinExpiredMessages();
      for (const { conversationId, messageId } of expired) {
        getIo().to(`conversation:${conversationId}`).emit("pinnedMessage:expired", { conversationId, messageId });
      }
    } catch (err) {
      logger.error("Pin expiry job failed", { error: String(err) });
    }
  }, CHECK_INTERVAL_MS);
}
