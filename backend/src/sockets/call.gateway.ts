import { Server } from "socket.io";
import { CallStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { callsService } from "../modules/calls/calls.service";
import { AuthenticatedSocket } from "./index";

const CALL_TIMEOUT_MS = 60_000;
const activeCalls = new Map<string, { logId: string; startTime: number; timeout: ReturnType<typeof setTimeout> }>();

function clearCallTimeout(callKey: string) {
  const active = activeCalls.get(callKey);
  if (active?.timeout) clearTimeout(active.timeout);
}

export function registerCallHandlers(io: Server, socket: AuthenticatedSocket) {
  socket.on("call:offer", async (data: { targetUserId: string; conversationId: string; offer: any; callType: "audio" | "video" }) => {
    const caller = await prisma.user.findUnique({
      where: { id: socket.userId },
      select: { id: true, displayName: true, username: true, avatarUrl: true },
    });

    const log = await callsService.createLog(socket.userId, data.targetUserId, data.callType);
    const callKey = [socket.userId, data.targetUserId].sort().join(":");

    const timeout = setTimeout(async () => {
      const active = activeCalls.get(callKey);
      if (active) {
        await callsService.updateStatus(active.logId, CallStatus.MISSED).catch(() => {});
        activeCalls.delete(callKey);
        io.to(`user:${socket.userId}`).emit("call:timeout", { targetUserId: data.targetUserId, conversationId: data.conversationId });
        io.to(`user:${data.targetUserId}`).emit("call:timeout", { callerId: socket.userId, conversationId: data.conversationId });
      }
    }, CALL_TIMEOUT_MS);

    activeCalls.set(callKey, { logId: log.id, startTime: Date.now(), timeout });

    io.to(`user:${data.targetUserId}`).emit("call:offer", {
      callerId: socket.userId,
      callerDisplayName: caller?.displayName ?? "",
      callerAvatarUrl: caller?.avatarUrl ?? null,
      conversationId: data.conversationId,
      offer: data.offer,
      callType: data.callType,
      callLogId: log.id,
    });
  });

  socket.on("call:answer", async (data: { targetUserId: string; answer: any }) => {
    const callKey = [socket.userId, data.targetUserId].sort().join(":");
    clearCallTimeout(callKey);
    const active = activeCalls.get(callKey);
    if (active) {
      await callsService.updateStatus(active.logId, CallStatus.ANSWERED);
    }

    io.to(`user:${data.targetUserId}`).emit("call:answer", {
      callerId: socket.userId,
      answer: data.answer,
    });
  });

  socket.on("call:ice-candidate", (data: { targetUserId: string; candidate: any }) => {
    io.to(`user:${data.targetUserId}`).emit("call:ice-candidate", {
      callerId: socket.userId,
      candidate: data.candidate,
    });
  });

  socket.on("call:end", async (data: { targetUserId: string; conversationId: string }) => {
    const callKey = [socket.userId, data.targetUserId].sort().join(":");
    clearCallTimeout(callKey);
    const active = activeCalls.get(callKey);
    if (active) {
      const duration = Math.floor((Date.now() - active.startTime) / 1000);
      await callsService.updateStatus(active.logId, CallStatus.ANSWERED, duration);
      activeCalls.delete(callKey);
    }

    io.to(`user:${data.targetUserId}`).emit("call:end", {
      callerId: socket.userId,
      conversationId: data.conversationId,
    });
  });

  socket.on("call:reject", async (data: { targetUserId: string; conversationId: string }) => {
    const callKey = [socket.userId, data.targetUserId].sort().join(":");
    clearCallTimeout(callKey);
    const active = activeCalls.get(callKey);
    if (active) {
      await callsService.updateStatus(active.logId, CallStatus.REJECTED);
      activeCalls.delete(callKey);
    }

    io.to(`user:${data.targetUserId}`).emit("call:reject", {
      callerId: socket.userId,
      conversationId: data.conversationId,
    });
  });

  socket.on("call:busy", async (data: { targetUserId: string }) => {
    const callKey = [socket.userId, data.targetUserId].sort().join(":");
    clearCallTimeout(callKey);
    const active = activeCalls.get(callKey);
    if (active) {
      await callsService.updateStatus(active.logId, CallStatus.BUSY);
      activeCalls.delete(callKey);
    }

    io.to(`user:${data.targetUserId}`).emit("call:busy", {
      callerId: socket.userId,
    });
  });
}
