import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { Errors } from "../utils/errors";

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
