import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Noto'g'ri ma'lumot" },
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Noto'g'ri parametr" },
      });
    }
    req.query = result.data;
    next();
  };
}
