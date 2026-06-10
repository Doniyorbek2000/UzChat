import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { env } from "../config/env";
import { registerChatHandlers } from "./chat.gateway";
import { prisma } from "../config/prisma";

let io: Server | undefined;

export interface AuthenticatedSocket extends Socket {
  userId: string;
}

export function getIo(): Server {
  if (!io) throw new Error("Socket.io server not initialized");
  return io;
}

export function isUserOnline(userId: string): boolean {
  if (!io) return false;
  return io.sockets.adapter.rooms.has(`user:${userId}`);
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
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", async (socket) => {
    const authed = socket as AuthenticatedSocket;

    const participations = await prisma.conversationParticipant.findMany({
      where: { userId: authed.userId },
      include: { conversation: { include: { participants: { select: { userId: true } } } } },
    });

    const relatedUserIds = new Set<string>();
    for (const p of participations) {
      socket.join(`conversation:${p.conversationId}`);
      for (const cp of p.conversation.participants) {
        if (cp.userId !== authed.userId) relatedUserIds.add(cp.userId);
      }
    }
    socket.join(`user:${authed.userId}`);

    const onlineUserIds = [...relatedUserIds].filter((id) => isUserOnline(id));
    socket.emit("presence:initial", { userIds: onlineUserIds });

    io!.emit("presence:update", { userId: authed.userId, online: true });

    registerChatHandlers(io!, authed);

    socket.on("disconnect", async () => {
      await prisma.user.update({ where: { id: authed.userId }, data: { lastSeenAt: new Date() } });
      io!.emit("presence:update", { userId: authed.userId, online: false });
    });
  });

  return io;
}
