import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { badgesService } from "./badges.service";

const r = Router();
r.use(requireAuth);

r.get("/available", async (_req, res) => {
  const badges = await badgesService.getAvailableBadges();
  res.json(badges);
});

r.get("/me", async (req, res) => {
  const badges = await badgesService.getUserBadges(req.user!.sub);
  res.json(badges);
});

r.get("/user/:userId", async (req, res) => {
  const badges = await badgesService.getUserBadges(req.params.userId);
  res.json(badges);
});

r.post("/award", requireAdmin, async (req, res) => {
  const { userId, badge } = req.body;
  const result = await badgesService.awardBadge(userId, badge);
  res.json(result);
});

r.delete("/revoke", requireAdmin, async (req, res) => {
  const { userId, badge } = req.body;
  await badgesService.revokeBadge(userId, badge);
  res.json({ success: true });
});

export const badgesRouter = r;
