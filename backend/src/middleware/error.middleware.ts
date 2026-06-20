import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";
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

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Noto'g'ri JSON formati" },
    });
  }

  if (err instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: "Fayl hajmi juda katta (max 50 MB)",
      LIMIT_UNEXPECTED_FILE: "Ruxsat etilmagan fayl turi",
      LIMIT_FILE_COUNT: "Juda ko'p fayl yuklandi",
      LIMIT_FIELD_COUNT: "Juda ko'p maydon",
    };
    const message = messages[err.code] ?? "Faylni yuklashda xatolik";
    return res.status(400).json({ error: { code: "FILE_UPLOAD_ERROR", message } });
  }

  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server xatosi yuz berdi" } });
}
