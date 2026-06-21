import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { faqService } from "./faq.service";

const r = Router();
r.use(requireAuth);

r.get("/", async (req, res) => {
  const category = req.query.category as string | undefined;
  const articles = await faqService.list(category);
  res.json(articles);
});

r.get("/categories", async (_req, res) => {
  const categories = await faqService.getCategories();
  res.json(categories);
});

r.get("/search", async (req, res) => {
  const q = String(req.query.q || "");
  const results = await faqService.search(q);
  res.json(results);
});

r.post("/", requireAdmin, async (req, res) => {
  const article = await faqService.create(req.body);
  res.status(201).json(article);
});

r.put("/:id", requireAdmin, async (req, res) => {
  const article = await faqService.update(req.params.id, req.body);
  res.json(article);
});

r.delete("/:id", requireAdmin, async (req, res) => {
  await faqService.remove(req.params.id);
  res.json({ success: true });
});

export const faqRouter = r;
