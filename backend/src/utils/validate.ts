import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export function validateUuidParam(...paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const name of paramNames) {
      const value = req.params[name];
      if (value && !UUID_RE.test(value)) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: `Noto'g'ri ${name} formati` },
        });
      }
    }
    next();
  };
}

export function uuidParamHandler(_req: Request, res: Response, next: NextFunction, value: string) {
  if (!UUID_RE.test(value)) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Noto'g'ri ID formati" },
    });
  }
  next();
}
