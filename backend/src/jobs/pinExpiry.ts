import { chatsService } from "../modules/chats/chats.service";
import { getIo } from "../sockets";

const CHECK_INTERVAL_MS = 60 * 1000;

export function startPinExpiryJob() {
  setInterval(async () => {
    try {
      const expired = await chatsService.unpinExpiredMessages();
      for (const { conversationId, messageId } of expired) {
        getIo().to(`conversation:${conversationId}`).emit("pinnedMessage:expired", { conversationId, messageId });
      }
    } catch (err) {
      console.error("Pin expiry job failed:", err);
    }
  }, CHECK_INTERVAL_MS);
}
