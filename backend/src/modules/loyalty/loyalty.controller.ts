import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { loyaltyService } from "./loyalty.service";

const r = Router();
r.use(requireAuth);

r.get("/me", async (req, res) => {
  const points = await loyaltyService.getPoints(req.user!.sub);
  res.json(points);
});

r.get("/history", async (req, res) => {
  const history = await loyaltyService.getHistory(req.user!.sub);
  res.json(history);
});

r.get("/leaderboard", async (_req, res) => {
  const leaderboard = await loyaltyService.getLeaderboard();
  res.json(leaderboard);
});

r.post("/spend", async (req, res) => {
  const { amount, reason } = req.body;
  const result = await loyaltyService.spendPoints(req.user!.sub, amount, reason);
  res.json(result);
});

export const loyaltyRouter = r;
