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
    // A function (not a static object) so reconnection attempts always send a
    // fresh access token, refreshing it first if it has expired since connecting.
    auth: (cb) => {
      getValidAccessToken().then((token) => cb({ token }));
    },
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
