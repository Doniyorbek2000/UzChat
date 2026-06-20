import { Server } from "socket.io";
import { AuthenticatedSocket } from "./index";

export function registerCallHandlers(io: Server, socket: AuthenticatedSocket) {
  socket.on("call:offer", (data: { targetUserId: string; conversationId: string; offer: any; callType: "audio" | "video" }) => {
    io.to(`user:${data.targetUserId}`).emit("call:offer", {
      callerId: socket.userId,
      conversationId: data.conversationId,
      offer: data.offer,
      callType: data.callType,
    });
  });

  socket.on("call:answer", (data: { targetUserId: string; answer: any }) => {
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

  socket.on("call:end", (data: { targetUserId: string; conversationId: string }) => {
    io.to(`user:${data.targetUserId}`).emit("call:end", {
      callerId: socket.userId,
      conversationId: data.conversationId,
    });
  });

  socket.on("call:reject", (data: { targetUserId: string; conversationId: string }) => {
    io.to(`user:${data.targetUserId}`).emit("call:reject", {
      callerId: socket.userId,
      conversationId: data.conversationId,
    });
  });

  socket.on("call:busy", (data: { targetUserId: string }) => {
    io.to(`user:${data.targetUserId}`).emit("call:busy", {
      callerId: socket.userId,
    });
  });
}
