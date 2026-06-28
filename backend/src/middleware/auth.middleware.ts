import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { Errors } from "../utils/errors";
import { prisma } from "../config/prisma";

const banCheckCache = new Map<string, { banned: boolean; ts: number }>();
const BAN_CHECK_TTL_MS = 60_000;

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(Errors.unauthorized());
  }

  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(Errors.unauthorized());
  }
}

export async function requireNotBanned(req: Request, _res: Response, next: NextFunction) {
  const userId = req.user!.sub;
  const cached = banCheckCache.get(userId);
  if (cached && Date.now() - cached.ts < BAN_CHECK_TTL_MS) {
    if (cached.banned) return next(Errors.forbidden("Hisobingiz bloklangan"));
    return next();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true },
  });
  const banned = !!user?.isBanned;
  banCheckCache.set(userId, { banned, ts: Date.now() });
  if (banned) return next(Errors.forbidden("Hisobingiz bloklangan"));
  next();
}
