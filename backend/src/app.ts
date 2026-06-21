import "express-async-errors";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { contactsRouter } from "./modules/contacts/contacts.routes";
import { chatsRouter } from "./modules/chats/chats.routes";
import { mediaRouter } from "./modules/media/media.routes";
import { pushRouter } from "./modules/push/push.routes";
import { foldersRouter } from "./modules/folders/folders.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { broadcastsRouter } from "./modules/broadcasts/broadcasts.routes";
import { storiesRouter } from "./modules/stories/stories.controller";
import { devicesRouter } from "./modules/devices/devices.controller";
import { paymentsRouter } from "./modules/payments/payments.controller";
import { miniAppsRouter } from "./modules/miniapps/miniapps.controller";
import { callsRouter } from "./modules/calls/calls.controller";
import { feedRouter } from "./modules/feed/feed.controller";
import { marketplaceRouter } from "./modules/marketplace/marketplace.controller";
import { redPacketsRouter } from "./modules/redpackets/redpackets.controller";
import { adminRouter } from "./modules/admin/admin.controller";
import { stickersRouter } from "./modules/stickers/stickers.controller";
import { highlightsRouter } from "./modules/stories/highlights.controller";
import { nearbyRouter } from "./modules/nearby/nearby.controller";
import { botsRouter } from "./modules/bots/bots.controller";
import { reelsRouter } from "./modules/reels/reels.controller";
import { liveStreamRouter } from "./modules/livestream/livestream.controller";
import { themesRouter } from "./modules/themes/themes.controller";
import { communitiesRouter } from "./modules/communities/communities.controller";
import { forumsRouter } from "./modules/forums/forums.controller";
import { voiceRoomsRouter } from "./modules/voicerooms/voicerooms.controller";
import { eventsRouter } from "./modules/events/events.controller";
import { translateRouter } from "./modules/translate/translate.controller";
import { searchRouter } from "./modules/search/search.controller";
import { subscriptionsRouter } from "./modules/subscriptions/subscriptions.controller";
import { bookmarksRouter } from "./modules/bookmarks/bookmarks.controller";
import { notesRouter } from "./modules/notes/notes.controller";
import { locationRouter } from "./modules/location/location.controller";
import { exportRouter } from "./modules/export/export.controller";
import { draftsRouter } from "./modules/drafts/drafts.controller";
import { autoReplyRouter } from "./modules/autoreply/autoreply.controller";
import { musicRouter } from "./modules/music/music.controller";
import { gamesRouter } from "./modules/games/games.controller";
import { referralsRouter } from "./modules/referrals/referrals.controller";
import { cloudRouter } from "./modules/cloud/cloud.controller";
import { businessRouter } from "./modules/business/business.controller";
import { hashtagsRouter } from "./modules/hashtags/hashtags.controller";
import { badgesRouter } from "./modules/badges/badges.controller";
import { giftsRouter } from "./modules/gifts/gifts.controller";
import { greetingsRouter } from "./modules/greetings/greetings.controller";
import { preferencesRouter } from "./modules/preferences/preferences.controller";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiRateLimiter } from "./middleware/rateLimit.middleware";
import { requestIdMiddleware } from "./middleware/requestId.middleware";

export function createApp() {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "5mb" }));
  if (env.nodeEnv !== "test") {
    app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
  }

  app.get("/health", async (_req, res) => {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: "ok",
        uptime: Math.floor(process.uptime()),
        dbLatency: Date.now() - start,
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      });
    } catch {
      res.status(503).json({ status: "degraded", db: "unreachable" });
    }
  });

  app.use("/auth", authRouter);
  app.use("/users", apiRateLimiter, usersRouter);
  app.use("/contacts", apiRateLimiter, contactsRouter);
  app.use("/conversations", apiRateLimiter, chatsRouter);
  app.use("/media", apiRateLimiter, mediaRouter);
  app.use("/push", apiRateLimiter, pushRouter);
  app.use("/chat-folders", apiRateLimiter, foldersRouter);
  app.use("/reports", apiRateLimiter, reportsRouter);
  app.use("/broadcast-lists", apiRateLimiter, broadcastsRouter);
  app.use("/stories", apiRateLimiter, storiesRouter);
  app.use("/devices", apiRateLimiter, devicesRouter);
  app.use("/payments", apiRateLimiter, paymentsRouter);
  app.use("/mini-apps", apiRateLimiter, miniAppsRouter);
  app.use("/calls", apiRateLimiter, callsRouter);
  app.use("/feed", apiRateLimiter, feedRouter);
  app.use("/marketplace", apiRateLimiter, marketplaceRouter);
  app.use("/red-packets", apiRateLimiter, redPacketsRouter);
  app.use("/admin", apiRateLimiter, adminRouter);
  app.use("/stickers", apiRateLimiter, stickersRouter);
  app.use("/highlights", apiRateLimiter, highlightsRouter);
  app.use("/nearby", apiRateLimiter, nearbyRouter);
  app.use("/bots", apiRateLimiter, botsRouter);
  app.use("/reels", apiRateLimiter, reelsRouter);
  app.use("/live", apiRateLimiter, liveStreamRouter);
  app.use("/themes", apiRateLimiter, themesRouter);
  app.use("/communities", apiRateLimiter, communitiesRouter);
  app.use("/forums", apiRateLimiter, forumsRouter);
  app.use("/voice-rooms", apiRateLimiter, voiceRoomsRouter);
  app.use("/events", apiRateLimiter, eventsRouter);
  app.use("/translate", apiRateLimiter, translateRouter);
  app.use("/search", apiRateLimiter, searchRouter);
  app.use("/subscriptions", apiRateLimiter, subscriptionsRouter);
  app.use("/bookmarks", apiRateLimiter, bookmarksRouter);
  app.use("/notes", apiRateLimiter, notesRouter);
  app.use("/location", apiRateLimiter, locationRouter);
  app.use("/chat-export", apiRateLimiter, exportRouter);
  app.use("/drafts", apiRateLimiter, draftsRouter);
  app.use("/auto-reply", apiRateLimiter, autoReplyRouter);
  app.use("/music", apiRateLimiter, musicRouter);
  app.use("/games", apiRateLimiter, gamesRouter);
  app.use("/referrals", apiRateLimiter, referralsRouter);
  app.use("/cloud", apiRateLimiter, cloudRouter);
  app.use("/business", apiRateLimiter, businessRouter);
  app.use("/hashtags", apiRateLimiter, hashtagsRouter);
  app.use("/badges", apiRateLimiter, badgesRouter);
  app.use("/gifts", apiRateLimiter, giftsRouter);
  app.use("/greetings", apiRateLimiter, greetingsRouter);
  app.use("/preferences", apiRateLimiter, preferencesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
