import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { verifyAccessToken } from "../utils/jwt";
import { env } from "../config/env";
import { registerChatHandlers } from "./chat.gateway";
import { registerCallHandlers } from "./call.gateway";
import { prisma } from "../config/prisma";
import { pushService } from "../modules/push/push.service";
import { messagesService } from "../modules/messages/messages.service";
import { filterVisibleOnlineOwners, filterViewersForLastSeen } from "../utils/lastSeen";
import { presenceService } from "../services/presence.service";
import { logger } from "../utils/logger";
import { getRedis, getSubscriber } from "../config/redis";
import { socketEventsCounter } from "../middleware/metrics.middleware";

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

/** Checks only sockets connected to THIS node. Cheap, but misses users on other replicas. */
export function isUserOnlineLocal(userId: string): boolean {
  if (!io) return false;
  return io.sockets.adapter.rooms.has(`user:${userId}`);
}

/**
 * Cluster-wide online check: fast local-room hit first, then the shared
 * Redis presence key maintained by connection counting. Falls back to the
 * local answer when Redis is unavailable (single-node mode).
 */
export async function isUserOnline(userId: string): Promise<boolean> {
  if (isUserOnlineLocal(userId)) return true;
  return presenceService.isOnline(userId);
}

/** Cluster-wide batch filter: returns the subset of userIds that are online anywhere. */
export async function filterOnlineUsers(userIds: string[]): Promise<Set<string>> {
  const online = new Set<string>(userIds.filter((id) => isUserOnlineLocal(id)));
  const rest = userIds.filter((id) => !online.has(id));
  if (rest.length > 0) {
    const fromRedis = await presenceService.getOnlineUsers(rest);
    for (const id of fromRedis) online.add(id);
  }
  return online;
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
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6,
    perMessageDeflate: { threshold: 1024 },
    transports: ["websocket", "polling"],
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
  });

  try {
    const pubClient = getRedis();
    const subClient = getSubscriber();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info("Socket.io Redis adapter attached for horizontal scaling");
  } catch {
    logger.warn("Redis not available — running Socket.io in single-node mode");
  }

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("UNAUTHORIZED"));
    try {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { isBanned: true },
      });
      if (user?.isBanned) return next(new Error("BANNED"));
      (socket as AuthenticatedSocket).userId = payload.sub;
      (socket as AuthenticatedSocket).sid = payload.sid;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    handleConnection(socket as AuthenticatedSocket).catch((err) => {
      logger.error("Socket connection setup failed", { error: String(err) });
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
        select: {
          id: true,
          type: true,
          memberCount: true,
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        },
      },
    },
  });

  const wasOnline = await isUserOnline(authed.userId);
  await presenceService.addConnection(authed.userId).catch(() => {});

  // Keep the shared presence key alive for long-lived connections (its TTL
  // exists so a crashed node's users eventually read as offline).
  const presenceHeartbeat = setInterval(() => {
    presenceService.refreshConnection(authed.userId).catch(() => {});
  }, 120_000);
  presenceHeartbeat.unref?.();

  const smallGroupIds: string[] = [];
  for (const p of participations) {
    socket.join(`conversation:${p.conversationId}`);
    if (p.conversation.memberCount <= 500) {
      smallGroupIds.push(p.conversationId);
    }
  }
  socket.join(`user:${authed.userId}`);
  socket.join(`session:${authed.sid}`);

  const relatedUserIds = new Set<string>();
  if (smallGroupIds.length > 0) {
    const relatedParticipants = await prisma.conversationParticipant.findMany({
      where: { conversationId: { in: smallGroupIds }, userId: { not: authed.userId } },
      select: { userId: true },
      distinct: ["userId"],
    });
    for (const rp of relatedParticipants) {
      relatedUserIds.add(rp.userId);
    }
  }

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

  const onlineUserIds = [...(await filterOnlineUsers([...relatedUserIds]))];
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

  socket.onAny((event) => {
    socketEventsCounter.inc({ event: String(event).slice(0, 64) });
  });

  registerChatHandlers(io!, authed);
  registerCallHandlers(io!, authed);

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
    clearInterval(presenceHeartbeat);
    try {
      await prisma.user.update({ where: { id: authed.userId }, data: { lastSeenAt: new Date() } });
      const lastConnectionAnywhere = await presenceService.removeConnection(authed.userId);
      if (!isUserOnlineLocal(authed.userId) && lastConnectionAnywhere) {
        const smallConvs = await prisma.conversationParticipant.findMany({
          where: { userId: authed.userId },
          include: {
            conversation: { select: { memberCount: true } },
          },
        });
        const smallConvIds = smallConvs
          .filter((p) => p.conversation.memberCount <= 500)
          .map((p) => p.conversationId);

        if (smallConvIds.length > 0) {
          const relatedPeers = await prisma.conversationParticipant.findMany({
            where: { conversationId: { in: smallConvIds }, userId: { not: authed.userId } },
            select: { userId: true },
            distinct: ["userId"],
          });
          const currentRelatedUserIds = relatedPeers.map((r) => r.userId);
          const viewerIds = await filterViewersForLastSeen(authed.userId, currentRelatedUserIds);
          for (const viewerId of viewerIds) {
            io!.to(`user:${viewerId}`).emit("presence:update", { userId: authed.userId, online: false });
          }
        }
      }
    } catch (err) {
      logger.error("Socket disconnect handler failed", { error: String(err) });
    }
  });
}
