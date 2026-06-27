import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { validateBody, validateQuery } from "../../utils/validate";
import { faqService } from "./faq.service";

export const faqCategoryQuery = z.object({
  category: z.string().max(50).optional(),
});

export const faqSearchQuery = z.object({
  q: z.string().max(200).default(""),
});

export const createFaqSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  category: z.string().min(1).max(50),
});

export const updateFaqSchema = createFaqSchema.partial();

const r = Router();
r.use(requireAuth);

r.get("/", validateQuery(faqCategoryQuery), async (req, res) => {
  const { category } = req.query as unknown as z.infer<typeof faqCategoryQuery>;
  const articles = await faqService.list(category);
  res.json(articles);
});

r.get("/categories", async (_req, res) => {
  const categories = await faqService.getCategories();
  res.json(categories);
});

r.get("/search", validateQuery(faqSearchQuery), async (req, res) => {
  const { q } = req.query as unknown as z.infer<typeof faqSearchQuery>;
  const results = await faqService.search(q);
  res.json(results);
});

r.post("/", requireAdmin, validateBody(createFaqSchema), async (req, res) => {
  const article = await faqService.create(req.body);
  res.status(201).json(article);
});

r.put("/:id", requireAdmin, validateBody(updateFaqSchema), async (req, res) => {
  const article = await faqService.update(req.params.id, req.body);
  res.json(article);
});

r.delete("/:id", requireAdmin, async (req, res) => {
  await faqService.remove(req.params.id);
  res.status(204).send();
});

export const faqRouter = r;
