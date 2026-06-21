import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { giftsService } from "./gifts.service";

const r = Router();
r.use(requireAuth);

r.get("/", async (req, res) => {
  const category = req.query.category as string | undefined;
  const gifts = await giftsService.listGifts(category);
  res.json(gifts);
});

r.post("/send", async (req, res) => {
  const { receiverId, giftId, message } = req.body;
  const result = await giftsService.sendGift(req.user!.sub, receiverId, giftId, message);
  res.json(result);
});

r.get("/received", async (req, res) => {
  const gifts = await giftsService.getReceivedGifts(req.user!.sub);
  res.json(gifts);
});

r.get("/sent", async (req, res) => {
  const gifts = await giftsService.getSentGifts(req.user!.sub);
  res.json(gifts);
});

r.post("/create", requireAdmin, async (req, res) => {
  const { name, icon, price, category } = req.body;
  const gift = await giftsService.createGift({ name, icon, price, category });
  res.status(201).json(gift);
});

export const giftsRouter = r;
