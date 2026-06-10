import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "../config/env";

let socket: Socket | null = null;

export function connectSocket(accessToken: string): Socket {
  socket?.disconnect();
  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ["websocket"],
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
