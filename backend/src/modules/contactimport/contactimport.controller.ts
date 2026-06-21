import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { contactImportService } from "./contactimport.service";

const r = Router();
r.use(requireAuth);

r.post("/sync", async (req, res) => {
  const { contacts } = req.body;
  const results = await contactImportService.importContacts(req.user!.sub, contacts ?? []);
  res.json(results);
});

r.get("/matched", async (req, res) => {
  const contacts = await contactImportService.getImportedContacts(req.user!.sub);
  res.json(contacts);
});

r.delete("/clear", async (req, res) => {
  await contactImportService.clearImported(req.user!.sub);
  res.json({ success: true });
});

export const contactImportRouter = r;
