import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateUuidParam } from "../../utils/validate";
import { createNoteSchema, updateNoteSchema } from "./notes.schema";
import { notesService } from "./notes.service";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const notes = await notesService.list(req.user!.sub);
  res.json(notes);
});

router.get("/:noteId", validateUuidParam("noteId"), async (req: Request, res: Response) => {
  const note = await notesService.get(req.user!.sub, req.params.noteId);
  res.json(note);
});

router.post("/", validateBody(createNoteSchema), async (req: Request, res: Response) => {
  const note = await notesService.create(req.user!.sub, req.body);
  res.status(201).json(note);
});

router.patch("/:noteId", validateUuidParam("noteId"), validateBody(updateNoteSchema), async (req: Request, res: Response) => {
  const note = await notesService.update(req.user!.sub, req.params.noteId, req.body);
  res.json(note);
});

router.delete("/:noteId", validateUuidParam("noteId"), async (req: Request, res: Response) => {
  await notesService.delete(req.user!.sub, req.params.noteId);
  res.status(204).send();
});

export { router as notesRouter };
