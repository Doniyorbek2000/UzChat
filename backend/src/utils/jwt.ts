import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string;
  username: string;
  // Identifies the RefreshToken row this token's session belongs to.
  sid: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: AccessTokenPayload): string {
  // include a random jti so two tokens issued for the same user within the
  // same second don't collide on the RefreshToken.token unique constraint
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as AccessTokenPayload;
}

export interface TwoFactorPendingPayload {
  sub: string;
  type: "2fa-pending";
}

// Short-lived token issued after the account password is verified, exchanged
// for normal access/refresh tokens once the two-step verification password
// is also confirmed.
export function signTwoFactorPendingToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "2fa-pending" }, env.jwt.accessSecret, { expiresIn: "5m" });
}

export function verifyTwoFactorPendingToken(token: string): TwoFactorPendingPayload {
  const payload = jwt.verify(token, env.jwt.accessSecret) as TwoFactorPendingPayload;
  if (payload.type !== "2fa-pending") throw new Error("Invalid token type");
  return payload;
}
