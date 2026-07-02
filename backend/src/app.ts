import "express-async-errors";
import path from "path";
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
import { searchRouter } from "./modules/search/search.controller";
import { subscriptionsRouter } from "./modules/subscriptions/subscriptions.controller";
import { bookmarksRouter } from "./modules/bookmarks/bookmarks.controller";
import { notesRouter } from "./modules/notes/notes.controller";
import { locationRouter } from "./modules/location/location.controller";
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
import { contactImportRouter } from "./modules/contactimport/contactimport.controller";
import { wishlistRouter } from "./modules/wishlist/wishlist.controller";
import { loyaltyRouter } from "./modules/loyalty/loyalty.controller";
import { faqRouter } from "./modules/faq/faq.controller";
import { notifLogRouter } from "./modules/notiflog/notiflog.controller";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiRateLimiter } from "./middleware/rateLimit.middleware";
import { requestIdMiddleware } from "./middleware/requestId.middleware";
import { privacyHeaders, stripSensitiveFields } from "./middleware/privacy.middleware";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(requestIdMiddleware);
  app.use(privacyHeaders);
  app.use(stripSensitiveFields);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: env.nodeEnv === "production" ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    } : false,
    hsts: env.nodeEnv === "production" ? { maxAge: 31536000, includeSubDomains: true } : false,
  }));
  app.use(cors({
    origin: env.corsOrigin === "*" ? true : env.corsOrigin.includes(",") ? env.corsOrigin.split(",").map((o) => o.trim()) : env.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    maxAge: 86400,
  }));
  app.use((_req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(compression());
  app.use(express.json({ limit: "5mb" }));
  if (env.nodeEnv !== "test") {
    if (env.nodeEnv === "production") {
      app.use(morgan(":remote-addr :method :url :status :response-time ms"));
    } else {
      app.use(morgan("dev"));
    }
  }

  app.get("/health", async (_req, res) => {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - start;

      let redisStatus = "not_configured";
      let redisLatency: number | undefined;
      try {
        const { getRedis } = require("./config/redis");
        const r = getRedis();
        const redisStart = Date.now();
        await r.ping();
        redisLatency = Date.now() - redisStart;
        redisStatus = "connected";
      } catch {
        redisStatus = "unavailable";
      }

      res.json({
        status: "ok",
        version: "1.0.0",
        minAppVersion: "1.0.0",
        uptime: Math.floor(process.uptime()),
        dbLatency,
        redisStatus,
        redisLatency,
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        encryption: "e2ee_signal_protocol",
      });
    } catch {
      res.status(503).json({ status: "degraded", db: "unreachable" });
    }
  });

  app.get("/privacy-policy", (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>UzChat — Maxfiylik siyosati</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.6;color:#222}h1{color:#07C160}h2{margin-top:32px}</style></head><body>
<h1>UzChat — Maxfiylik siyosati</h1>
<p><strong>Oxirgi yangilanish:</strong> 2026-yil 21-iyun</p>
<h2>1. Qanday ma'lumotlar yig'iladi</h2>
<p>Telefon raqami, foydalanuvchi nomi, profil rasmi va boshqa siz kiritgan profil ma'lumotlari. Xabarlar end-to-end shifrlangan bo'lib, server faqat shifrlangan matnni saqlaydi.</p>
<h2>2. Ma'lumotlardan foydalanish</h2>
<p>Ma'lumotlaringiz faqat UzChat xizmatini ko'rsatish, hisobingizni himoya qilish va ilovani yaxshilash uchun ishlatiladi.</p>
<h2>3. Ma'lumotlarni ulashish</h2>
<p>Biz sizning shaxsiy ma'lumotlaringizni uchinchi tomonlarga sotmaymiz yoki ulashmaymiz, qonun talab qilgan holatlar bundan mustasno.</p>
<h2>4. Xavfsizlik</h2>
<p>Barcha xabarlar end-to-end shifrlangan. Parollar hash qilingan holda saqlanadi. Ikki bosqichli tekshiruv mavjud.</p>
<h2>5. Ma'lumotlarni o'chirish</h2>
<p>Hisobingizni istalgan vaqtda o'chirishingiz mumkin. Hisobni o'chirish barcha ma'lumotlaringizni doimiy ravishda o'chiradi.</p>
<h2>6. Aloqa</h2>
<p>Savollar uchun: <a href="mailto:support@uzchat.app">support@uzchat.app</a></p>
</body></html>`);
  });

  app.get("/terms", (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>UzChat — Foydalanish shartlari</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.6;color:#222}h1{color:#07C160}h2{margin-top:32px}</style></head><body>
<h1>UzChat — Foydalanish shartlari</h1>
<p><strong>Oxirgi yangilanish:</strong> 2026-yil 21-iyun</p>
<h2>1. Xizmatdan foydalanish</h2>
<p>UzChat'dan faqat qonuniy maqsadlarda foydalanishingiz mumkin. Spam, zo'ravonlik yoki noqonuniy kontent tarqatish taqiqlanadi.</p>
<h2>2. Hisob xavfsizligi</h2>
<p>Hisobingiz xavfsizligi uchun siz javobgarsiz. Parolingizni hech kim bilan bo'lishmang.</p>
<h2>3. Kontent</h2>
<p>Siz yuborgan barcha kontent uchun javobgarsiz. Boshqa foydalanuvchilarning huquqlarini hurmat qiling.</p>
<h2>4. Xizmatni to'xtatish</h2>
<p>Biz shartlarni buzgan hisoblarni ogohlantirmasdan to'xtatish huquqini saqlab qolamiz.</p>
<h2>5. O'zgarishlar</h2>
<p>Ushbu shartlar vaqti-vaqti bilan yangilanishi mumkin. Muhim o'zgarishlar haqida xabar beriladi.</p>
</body></html>`);
  });

  app.use("/admin-panel", express.static(path.join(__dirname, "../admin-panel")));

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
  app.use("/search", apiRateLimiter, searchRouter);
  app.use("/subscriptions", apiRateLimiter, subscriptionsRouter);
  app.use("/bookmarks", apiRateLimiter, bookmarksRouter);
  app.use("/notes", apiRateLimiter, notesRouter);
  app.use("/location", apiRateLimiter, locationRouter);
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
  app.use("/contact-import", apiRateLimiter, contactImportRouter);
  app.use("/wishlist", apiRateLimiter, wishlistRouter);
  app.use("/loyalty", apiRateLimiter, loyaltyRouter);
  app.use("/faq", apiRateLimiter, faqRouter);
  app.use("/notification-log", apiRateLimiter, notifLogRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
