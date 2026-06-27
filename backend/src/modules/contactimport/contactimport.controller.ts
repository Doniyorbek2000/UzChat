import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { contactImportService } from "./contactimport.service";

const syncSchema = z.object({
  contacts: z.array(z.object({
    phone: z.string().min(5).max(20),
    displayName: z.string().max(100).optional(),
  })).max(1000),
});

const r = Router();
r.use(requireAuth);

r.post("/sync", validateBody(syncSchema), async (req, res) => {
  const { contacts } = req.body;
  const results = await contactImportService.importContacts(req.user!.sub, contacts);
  res.json(results);
});

r.get("/matched", async (req, res) => {
  const contacts = await contactImportService.getImportedContacts(req.user!.sub);
  res.json(contacts);
});

r.delete("/clear", async (req, res) => {
  await contactImportService.clearImported(req.user!.sub);
  res.status(204).send();
});

export const contactImportRouter = r;
