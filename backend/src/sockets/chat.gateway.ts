import { Server } from "socket.io";
import { AuthenticatedSocket } from "./index";
import { messagesService } from "../modules/messages/messages.service";
import { sendMessageSchema } from "../modules/messages/messages.schema";
import { chatsService } from "../modules/chats/chats.service";
import { contactsService } from "../modules/contacts/contacts.service";

export function registerChatHandlers(io: Server, socket: AuthenticatedSocket) {
  socket.on("message:send", async (payload, ack?: (response: unknown) => void) => {
    try {
      const { conversationId, ...rest } = payload ?? {};
      const input = sendMessageSchema.parse(rest);
      const message = await messagesService.sendMessage(socket.userId, conversationId, input);
      io.to(`conversation:${conversationId}`).emit("message:new", message);
      ack?.({ ok: true, message });
    } catch (err) {
      ack?.({ ok: false, error: err instanceof Error ? err.message : "UNKNOWN_ERROR" });
    }
  });

  socket.on("typing", async (payload: { conversationId: string; isTyping: boolean }) => {
    try {
      if (!socket.typingIndicatorsEnabled) return;
      await chatsService.assertParticipant(socket.userId, payload.conversationId);
      if (await contactsService.isBlockedInDirectConversation(socket.userId, payload.conversationId)) return;
      socket.to(`conversation:${payload.conversationId}`).emit("typing", {
        conversationId: payload.conversationId,
        userId: socket.userId,
        isTyping: !!payload.isTyping,
      });
    } catch {
      // ignore typing events for conversations the user is not part of
    }
  });

  socket.on("voice-recording", async (payload: { conversationId: string; isRecording: boolean }) => {
    try {
      if (!socket.typingIndicatorsEnabled) return;
      await chatsService.assertParticipant(socket.userId, payload.conversationId);
      if (await contactsService.isBlockedInDirectConversation(socket.userId, payload.conversationId)) return;
      socket.to(`conversation:${payload.conversationId}`).emit("voice-recording", {
        conversationId: payload.conversationId,
        userId: socket.userId,
        isRecording: !!payload.isRecording,
      });
    } catch {
      // ignore voice-recording events for conversations the user is not part of
    }
  });

  socket.on("message:read", async (payload: { conversationId: string }) => {
    try {
      await messagesService.markRead(socket.userId, payload.conversationId);
      const viewerIds = await chatsService.getReadReceiptViewers(payload.conversationId, socket.userId);
      const event = { conversationId: payload.conversationId, userId: socket.userId, at: new Date().toISOString() };
      for (const viewerId of viewerIds) {
        io.to(`user:${viewerId}`).emit("message:read", event);
      }
    } catch {
      // ignore read receipts for conversations the user is not part of
    }
  });

  socket.on("message:delivered", async (payload: { conversationId: string }) => {
    try {
      await messagesService.markDelivered(socket.userId, payload.conversationId);
      socket.to(`conversation:${payload.conversationId}`).emit("message:delivered", {
        conversationId: payload.conversationId,
        userId: socket.userId,
        at: new Date().toISOString(),
      });
    } catch {
      // ignore delivery receipts for conversations the user is not part of
    }
  });

  socket.on("conversation:join", async (payload: { conversationId: string }) => {
    try {
      await chatsService.assertParticipant(socket.userId, payload.conversationId);
      socket.join(`conversation:${payload.conversationId}`);
    } catch {
      // ignore join attempts for conversations the user is not part of
    }
  });
}
