import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Endpoint topilmadi" } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: err.issues[0]?.message ?? "Noto'g'ri ma'lumot" },
    });
  }

  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server xatosi yuz berdi" } });
}
