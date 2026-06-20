import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { env } from "../config/env";
import { registerChatHandlers } from "./chat.gateway";
import { prisma } from "../config/prisma";
import { pushService } from "../modules/push/push.service";
import { messagesService } from "../modules/messages/messages.service";
import { filterVisibleOnlineOwners, filterViewersForLastSeen } from "../utils/lastSeen";

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

  io.on("connection", (socket) => {
    handleConnection(socket as AuthenticatedSocket).catch((err) => {
      console.error("Socket connection setup failed:", err);
      socket.disconnect(true);
    });
  });

  return io;
}

async function handleConnection(socket: AuthenticatedSocket) {
  const authed = socket;

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

  // Only broadcast "online" if this is the user's first active connection -
  // with multiple devices, the others are already aware they're online.
  const wasOnline = isUserOnline(authed.userId);

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
  const visibleOnlineUserIds = await filterVisibleOnlineOwners(authed.userId, onlineUserIds);
  socket.emit("presence:initial", { userIds: [...visibleOnlineUserIds] });

  if (!wasOnline) {
    const viewerIds = await filterViewersForLastSeen(authed.userId, [...relatedUserIds]);
    for (const viewerId of viewerIds) {
      io!.to(`user:${viewerId}`).emit("presence:update", { userId: authed.userId, online: true });
    }
  }

  const notifyRequests = await prisma.onlineNotifyRequest.findMany({
    where: { targetId: authed.userId },
    select: { ownerId: true },
  });
  if (notifyRequests.length > 0) {
    // Privacy/block settings may have changed since the request was made -
    // only notify owners who are still allowed to see this user's online status.
    const allowedOwnerIds = await filterViewersForLastSeen(authed.userId, notifyRequests.map((r) => r.ownerId));
    if (allowedOwnerIds.size > 0) {
      const target = await prisma.user.findUnique({ where: { id: authed.userId }, select: { displayName: true } });
      await pushService.sendToUsers([...allowedOwnerIds], {
        title: "Onlayn bo'ldi",
        body: `${target?.displayName} hozir onlayn`,
        data: { type: "user_online", userId: authed.userId },
      });
    }
    await prisma.onlineNotifyRequest.deleteMany({ where: { targetId: authed.userId } });
  }

  const publishedWhenOnline = await messagesService.publishWhenOnlineMessages(authed.userId);
  for (const message of publishedWhenOnline) {
    io!.to(`conversation:${message.conversationId}`).emit("message:new", message);
  }

  registerChatHandlers(io!, authed);

  // Clear any "typing"/"recording" indicators left behind by an abrupt
  // disconnect (app closed/crashed mid-keystroke), so peers don't see a
  // stuck indicator until the next message. Runs on "disconnecting" (before
  // socket.io removes the socket from its rooms) so it also covers
  // conversations joined mid-session via "conversation:join", not just the
  // ones from the initial `participations` snapshot.
  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (!room.startsWith("conversation:")) continue;
      const conversationId = room.slice("conversation:".length);
      socket.to(room).emit("typing", { conversationId, userId: authed.userId, isTyping: false });
      socket.to(room).emit("voice-recording", { conversationId, userId: authed.userId, isRecording: false });
    }
  });

  socket.on("disconnect", async () => {
    try {
      await prisma.user.update({ where: { id: authed.userId }, data: { lastSeenAt: new Date() } });
      if (!isUserOnline(authed.userId)) {
        const currentParticipations = await prisma.conversationParticipant.findMany({
          where: { userId: authed.userId },
          select: { conversation: { select: { participants: { select: { userId: true } } } } },
        });
        const currentRelatedUserIds = new Set<string>();
        for (const p of currentParticipations) {
          for (const cp of p.conversation.participants) {
            if (cp.userId !== authed.userId) currentRelatedUserIds.add(cp.userId);
          }
        }
        const viewerIds = await filterViewersForLastSeen(authed.userId, [...currentRelatedUserIds]);
        for (const viewerId of viewerIds) {
          io!.to(`user:${viewerId}`).emit("presence:update", { userId: authed.userId, online: false });
        }
      }
    } catch (err) {
      console.error("Socket disconnect handler failed:", err);
    }
  });
}
