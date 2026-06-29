import { Request, Response, NextFunction } from "express";

export function privacyHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
}

export function stripSensitiveFields(_req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (body && typeof body === "object") {
      body = stripFields(body);
    }
    return originalJson(body);
  };
  next();
}

const SENSITIVE_FIELDS = new Set([
  "passwordHash",
  "refreshTokenHash",
  "twoFactorSecret",
  "backupCodes",
  "totpSecret",
  "privateKey",
  "identityPrivateKey",
]);

function stripFields(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripFields);
  if (obj === null || typeof obj !== "object") return obj;
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    if (SENSITIVE_FIELDS.has(key)) continue;
    cleaned[key] = typeof obj[key] === "object" ? stripFields(obj[key]) : obj[key];
  }
  return cleaned;
}
