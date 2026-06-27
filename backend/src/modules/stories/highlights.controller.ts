import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateUuidParam } from "../../utils/validate";
import { z } from "zod";
import { highlightsService } from "./highlights.service";

const createHighlightSchema = z.object({
  title: z.string().trim().min(1).max(32),
  coverUrl: z.string().url().optional(),
});

const updateHighlightSchema = z.object({
  title: z.string().trim().min(1).max(32).optional(),
  coverUrl: z.string().url().optional(),
});

const addItemSchema = z.object({
  mediaUrl: z.string().url(),
  mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
  caption: z.string().trim().max(200).optional(),
});

const router = Router();
router.use(requireAuth);

router.get("/user/:userId", validateUuidParam("userId"), async (req: Request, res: Response) => {
  const highlights = await highlightsService.listByUser(req.params.userId);
  res.json(highlights);
});

router.get("/:highlightId", validateUuidParam("highlightId"), async (req: Request, res: Response) => {
  const highlight = await highlightsService.getHighlight(req.params.highlightId);
  res.json(highlight);
});

router.post("/", validateBody(createHighlightSchema), async (req: Request, res: Response) => {
  const highlight = await highlightsService.create(req.user!.sub, req.body);
  res.status(201).json(highlight);
});

router.patch("/:highlightId", validateUuidParam("highlightId"), validateBody(updateHighlightSchema), async (req: Request, res: Response) => {
  const highlight = await highlightsService.update(req.user!.sub, req.params.highlightId, req.body);
  res.json(highlight);
});

router.delete("/:highlightId", validateUuidParam("highlightId"), async (req: Request, res: Response) => {
  await highlightsService.delete(req.user!.sub, req.params.highlightId);
  res.status(204).send();
});

router.post("/:highlightId/items", validateUuidParam("highlightId"), validateBody(addItemSchema), async (req: Request, res: Response) => {
  const item = await highlightsService.addItem(req.user!.sub, req.params.highlightId, req.body);
  res.status(201).json(item);
});

router.delete("/items/:itemId", validateUuidParam("itemId"), async (req: Request, res: Response) => {
  await highlightsService.removeItem(req.user!.sub, req.params.itemId);
  res.status(204).send();
});

export { router as highlightsRouter };
