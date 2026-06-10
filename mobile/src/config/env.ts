// Point these at your local backend during development.
// e.g. for a physical device on the same network, use your computer's LAN IP.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? API_URL;
