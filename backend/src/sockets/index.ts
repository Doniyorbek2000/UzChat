import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { env } from "../config/env";
import { registerChatHandlers } from "./chat.gateway";
import { prisma } from "../config/prisma";
import { pushService } from "../modules/push/push.service";
import { messagesService } from "../modules/messages/messages.service";

let io: Server | undefined;

export interface AuthenticatedSocket extends Socket {
  userId: string;
  sid: string;
  typingIndicatorsEnabled: boolean;
}

export function getIo(): Server {
  if (!io) throw new Error("Socket.io server not initialized");
  return io;
}

export function isUserOnline(userId: string): boolean {
  if (!io) return false;
  return io.sockets.adapter.rooms.has(`user:${userId}`);
}

/** Force-disconnects every socket belonging to the given session (refresh token), e.g. after it's revoked. */
export function disconnectSession(sessionId: string): void {
  if (!io) return;
  io.in(`session:${sessionId}`).disconnectSockets(true);
}

/** Force-disconnects every socket for the given user, e.g. after all their sessions are revoked. */
export function disconnectUser(userId: string): void {
  if (!io) return;
  io.in(`user:${userId}`).disconnectSockets(true);
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("UNAUTHORIZED"));
    try {
      const payload = verifyAccessToken(token);
      (socket as AuthenticatedSocket).userId = payload.sub;
      (socket as AuthenticatedSocket).sid = payload.sid;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", async (socket) => {
    const authed = socket as AuthenticatedSocket;

    const self = await prisma.user.findUnique({
      where: { id: authed.userId },
      select: { typingIndicatorsEnabled: true },
    });
    authed.typingIndicatorsEnabled = self?.typingIndicatorsEnabled ?? true;

    const participations = await prisma.conversationParticipant.findMany({
      where: { userId: authed.userId },
      include: {
        conversation: {
          include: {
            participants: { select: { userId: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
          },
        },
      },
    });

    const relatedUserIds = new Set<string>();
    for (const p of participations) {
      socket.join(`conversation:${p.conversationId}`);
      for (const cp of p.conversation.participants) {
        if (cp.userId !== authed.userId) relatedUserIds.add(cp.userId);
      }
    }
    socket.join(`user:${authed.userId}`);
    socket.join(`session:${authed.sid}`);

    const undeliveredConversationIds = participations
      .filter((p) => p.conversation.messages.length > 0 && (!p.lastDeliveredAt || p.lastDeliveredAt < p.conversation.messages[0].createdAt))
      .map((p) => p.conversationId);
    if (undeliveredConversationIds.length > 0) {
      const deliveredAt = new Date();
      await prisma.conversationParticipant.updateMany({
        where: { userId: authed.userId, conversationId: { in: undeliveredConversationIds } },
        data: { lastDeliveredAt: deliveredAt },
      });
      for (const conversationId of undeliveredConversationIds) {
        socket.to(`conversation:${conversationId}`).emit("message:delivered", {
          conversationId,
          userId: authed.userId,
          at: deliveredAt.toISOString(),
        });
      }
    }

    const onlineUserIds = [...relatedUserIds].filter((id) => isUserOnline(id));
    socket.emit("presence:initial", { userIds: onlineUserIds });

    io!.emit("presence:update", { userId: authed.userId, online: true });

    const notifyRequests = await prisma.onlineNotifyRequest.findMany({
      where: { targetId: authed.userId },
      select: { ownerId: true },
    });
    if (notifyRequests.length > 0) {
      const target = await prisma.user.findUnique({ where: { id: authed.userId }, select: { displayName: true } });
      await pushService.sendToUsers(notifyRequests.map((r) => r.ownerId), {
        title: "Onlayn bo'ldi",
        body: `${target?.displayName} hozir onlayn`,
        data: { type: "user_online", userId: authed.userId },
      });
      await prisma.onlineNotifyRequest.deleteMany({ where: { targetId: authed.userId } });
    }

    const publishedWhenOnline = await messagesService.publishWhenOnlineMessages(authed.userId);
    for (const message of publishedWhenOnline) {
      io!.to(`conversation:${message.conversationId}`).emit("message:new", message);
    }

    registerChatHandlers(io!, authed);

    socket.on("disconnect", async () => {
      await prisma.user.update({ where: { id: authed.userId }, data: { lastSeenAt: new Date() } });
      io!.emit("presence:update", { userId: authed.userId, online: false });

      // Clear any "typing"/"recording" indicators left behind by an abrupt
      // disconnect (app closed/crashed mid-keystroke), so peers don't see a
      // stuck indicator until the next message.
      for (const p of participations) {
        socket.to(`conversation:${p.conversationId}`).emit("typing", {
          conversationId: p.conversationId,
          userId: authed.userId,
          isTyping: false,
        });
        socket.to(`conversation:${p.conversationId}`).emit("voice-recording", {
          conversationId: p.conversationId,
          userId: authed.userId,
          isRecording: false,
        });
      }
    });
  });

  return io;
}
