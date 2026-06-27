import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { preferencesService } from "./preferences.service";

export const setValueSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const setManySchema = z.record(z.string().max(100), z.union([z.string(), z.number(), z.boolean()])).refine(
  (obj) => Object.keys(obj).length <= 50,
  { message: "Maksimum 50 ta sozlama bir vaqtda o'rnatish mumkin" },
);

const r = Router();
r.use(requireAuth);

r.get("/", async (req, res) => {
  const prefs = await preferencesService.getAll(req.user!.sub);
  res.json(prefs);
});

r.get("/:key", async (req, res) => {
  const value = await preferencesService.get(req.user!.sub, req.params.key);
  res.json({ key: req.params.key, value });
});

r.put("/:key", validateBody(setValueSchema), async (req, res) => {
  const { value } = req.body;
  await preferencesService.set(req.user!.sub, req.params.key, String(value));
  res.json({ key: req.params.key, value: String(value) });
});

r.put("/", validateBody(setManySchema), async (req, res) => {
  await preferencesService.setMany(req.user!.sub, req.body);
  res.status(204).send();
});

r.delete("/:key", async (req, res) => {
  await preferencesService.remove(req.user!.sub, req.params.key);
  res.status(204).send();
});

export const preferencesRouter = r;
