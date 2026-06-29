import { PrismaClient } from "@prisma/client";
import { isProduction } from "./env";

const connectionUrl = process.env.DATABASE_URL ?? "";
const poolUrl = isProduction
  ? connectionUrl.includes("connection_limit=")
    ? connectionUrl
    : `${connectionUrl}${connectionUrl.includes("?") ? "&" : "?"}connection_limit=20&pool_timeout=30`
  : connectionUrl;

export const prisma = new PrismaClient({
  log: isProduction
    ? [{ emit: "event", level: "warn" }, { emit: "event", level: "error" }]
    : [{ emit: "event", level: "warn" }, { emit: "event", level: "error" }],
  datasourceUrl: poolUrl,
});

prisma.$on("warn", (e) => {
  console.warn("Prisma warning:", e.message);
});

prisma.$on("error", (e) => {
  console.error("Prisma error:", e.message);
});

export const readReplica = isProduction && process.env.DATABASE_READ_URL
  ? new PrismaClient({
      datasourceUrl: process.env.DATABASE_READ_URL,
      log: [{ emit: "event", level: "error" }],
    })
  : prisma;
