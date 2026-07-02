import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
  },
  sms: {
    provider: process.env.SMS_PROVIDER ?? "log",
    eskizEmail: process.env.ESKIZ_EMAIL ?? "",
    eskizPassword: process.env.ESKIZ_PASSWORD ?? "",
    eskizFrom: process.env.ESKIZ_FROM ?? "4546",
  },
  corsOrigin: process.env.CORS_ORIGIN ?? (process.env.NODE_ENV === "production" ? "https://uzchat.app" : "*"),
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    prefix: process.env.REDIS_PREFIX ?? "uzchat:",
  },
  payments: {
    // Self-service wallet top-up stays disabled until a real payment
    // provider (Payme/Click/Uzum) webhook verifies the money actually
    // arrived — otherwise any user could mint unlimited balance.
    topUpEnabled: process.env.PAYMENTS_TOPUP_ENABLED === "true",
  },
} as const;

export const isProduction = env.nodeEnv === "production";
