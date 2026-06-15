import { decodeBase64, encodeUTF8 } from "tweetnacl-util";

function decodeJwtPayload(token: string): { exp?: number } | null {
  const segment = token.split(".")[1];
  if (!segment) return null;
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(encodeUTF8(decodeBase64(padded)));
  } catch {
    return null;
  }
}

/** True if the JWT's "exp" claim is missing, unreadable, or within `bufferSeconds` of (or past) expiry. */
export function isJwtExpired(token: string, bufferSeconds = 10): boolean {
  const exp = decodeJwtPayload(token)?.exp;
  if (!exp) return true;
  return exp * 1000 - bufferSeconds * 1000 <= Date.now();
}
