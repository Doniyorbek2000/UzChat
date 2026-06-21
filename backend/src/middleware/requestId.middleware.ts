import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["x-request-id"];
  const id = typeof header === "string" && UUID_RE.test(header) ? header : randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
