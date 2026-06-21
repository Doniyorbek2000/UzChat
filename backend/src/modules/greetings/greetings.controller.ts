import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { greetingsService } from "./greetings.service";

const r = Router();
r.use(requireAuth);

r.get("/", async (req, res) => {
  const category = req.query.category as string | undefined;
  const cards = await greetingsService.listCards(category);
  res.json(cards);
});

r.get("/categories", async (_req, res) => {
  const categories = await greetingsService.getCategories();
  res.json(categories);
});

r.post("/send", async (req, res) => {
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

r.post("/create", requireAdmin, async (req, res) => {
  const { templateName, category, imageUrl } = req.body;
  const card = await greetingsService.createCard({ templateName, category, imageUrl });
  res.status(201).json(card);
});

export const greetingsRouter = r;
