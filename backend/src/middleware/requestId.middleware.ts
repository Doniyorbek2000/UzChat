import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers["x-request-id"] as string) || randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
