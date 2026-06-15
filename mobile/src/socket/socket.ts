import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "../config/env";

let socket: Socket | null = null;
let onForceLogout: (() => void) | null = null;

export function setForceLogoutHandler(handler: () => void) {
  onForceLogout = handler;
}

export function connectSocket(accessToken: string): Socket {
  socket?.disconnect();
  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ["websocket"],
  });
  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
      onForceLogout?.();
    }
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
