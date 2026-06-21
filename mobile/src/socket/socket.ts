import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "../config/env";
import { getValidAccessToken } from "../api/client";

let socket: Socket | null = null;
let onForceLogout: (() => void) | null = null;

export function setForceLogoutHandler(handler: () => void) {
  onForceLogout = handler;
}

export function connectSocket(): Socket {
  socket?.disconnect();
  socket = io(SOCKET_URL, {
    auth: (cb) => {
      getValidAccessToken().then((token) => cb({ token }));
    },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: Infinity,
    timeout: 15000,
  });
  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
      onForceLogout?.();
    }
  });
  socket.on("connect_error", () => {});
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
