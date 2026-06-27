import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { validateBody, validateQuery } from "../../utils/validate";
import { greetingsService } from "./greetings.service";

export const sendCardSchema = z.object({
  receiverId: z.string().uuid(),
  cardId: z.string().uuid(),
  message: z.string().max(500).optional(),
});

export const createCardSchema = z.object({
  templateName: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  imageUrl: z.string().url().max(500),
});

export const listCardsQuery = z.object({
  category: z.string().max(50).optional(),
});

const r = Router();
r.use(requireAuth);

r.get("/", validateQuery(listCardsQuery), async (req, res) => {
  const { category } = req.query as unknown as z.infer<typeof listCardsQuery>;
  const cards = await greetingsService.listCards(category);
  res.json(cards);
});

r.get("/categories", async (_req, res) => {
  const categories = await greetingsService.getCategories();
  res.json(categories);
});

r.post("/send", validateBody(sendCardSchema), async (req, res) => {
  const { receiverId, cardId, message } = req.body;
  const result = await greetingsService.sendCard(req.user!.sub, receiverId, cardId, message);
  res.json(result);
});

r.get("/received", async (req, res) => {
  const cards = await greetingsService.getReceivedCards(req.user!.sub);
  res.json(cards);
});

r.get("/sent", async (req, res) => {
  const cards = await greetingsService.getSentCards(req.user!.sub);
  res.json(cards);
});

r.post("/create", requireAdmin, validateBody(createCardSchema), async (req, res) => {
  const { templateName, category, imageUrl } = req.body;
  const card = await greetingsService.createCard({ templateName, category, imageUrl });
  res.status(201).json(card);
});

export const greetingsRouter = r;
