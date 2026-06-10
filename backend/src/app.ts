import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { contactsRouter } from "./modules/contacts/contacts.routes";
import { chatsRouter } from "./modules/chats/chats.routes";
import { mediaRouter } from "./modules/media/media.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiRateLimiter } from "./middleware/rateLimit.middleware";

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "5mb" }));
  if (env.nodeEnv !== "test") {
    app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
  }

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth", authRouter);
  app.use("/users", apiRateLimiter, usersRouter);
  app.use("/contacts", apiRateLimiter, contactsRouter);
  app.use("/conversations", apiRateLimiter, chatsRouter);
  app.use("/media", apiRateLimiter, mediaRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
