import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { notifLogService } from "./notiflog.service";

const r = Router();
r.use(requireAuth);

r.get("/", async (req, res) => {
  const cursor = req.query.cursor as string | undefined;
  const result = await notifLogService.getNotifications(req.user!.sub, cursor);
  res.json(result);
});

r.get("/unread-count", async (req, res) => {
  const count = await notifLogService.getUnreadCount(req.user!.sub);
  res.json({ count });
});

r.patch("/:id/read", async (req, res) => {
  await notifLogService.markAsRead(req.user!.sub, req.params.id);
  res.status(204).send();
});

r.patch("/read-all", async (req, res) => {
  await notifLogService.markAllAsRead(req.user!.sub);
  res.status(204).send();
});

r.delete("/clear", async (req, res) => {
  await notifLogService.clearAll(req.user!.sub);
  res.status(204).send();
});

export const notifLogRouter = r;
