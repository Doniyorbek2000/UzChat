import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { preferencesService } from "./preferences.service";

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

r.put("/:key", async (req, res) => {
  const { value } = req.body;
  await preferencesService.set(req.user!.sub, req.params.key, String(value));
  res.json({ key: req.params.key, value: String(value) });
});

r.put("/", async (req, res) => {
  await preferencesService.setMany(req.user!.sub, req.body);
  res.json({ success: true });
});

r.delete("/:key", async (req, res) => {
  await preferencesService.remove(req.user!.sub, req.params.key);
  res.json({ success: true });
});

export const preferencesRouter = r;
