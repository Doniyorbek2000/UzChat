import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { validateBody, validateQuery } from "../../utils/validate";
import { giftsService } from "./gifts.service";

export const sendGiftSchema = z.object({
  receiverId: z.string().uuid(),
  giftId: z.string().uuid(),
  message: z.string().max(500).optional(),
});

export const createGiftSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().min(1).max(200),
  price: z.number().int().min(0),
  category: z.string().min(1).max(50),
});

export const listGiftsQuery = z.object({
  category: z.string().max(50).optional(),
});

const r = Router();
r.use(requireAuth);

r.get("/", validateQuery(listGiftsQuery), async (req, res) => {
  const { category } = req.query as unknown as z.infer<typeof listGiftsQuery>;
  const gifts = await giftsService.listGifts(category);
  res.json(gifts);
});

r.post("/send", validateBody(sendGiftSchema), async (req, res) => {
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

r.post("/create", requireAdmin, validateBody(createGiftSchema), async (req, res) => {
  const { name, icon, price, category } = req.body;
  const gift = await giftsService.createGift({ name, icon, price, category });
  res.status(201).json(gift);
});

export const giftsRouter = r;
