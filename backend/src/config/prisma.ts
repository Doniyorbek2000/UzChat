import { PrismaClient } from "@prisma/client";
import { isProduction } from "./env";

export const prisma = new PrismaClient({
  log: isProduction
    ? [{ emit: "event", level: "warn" }, { emit: "event", level: "error" }]
    : [{ emit: "event", level: "warn" }, { emit: "event", level: "error" }],
});

prisma.$on("warn", (e) => {
  console.warn("Prisma warning:", e.message);
});

prisma.$on("error", (e) => {
  console.error("Prisma error:", e.message);
});
