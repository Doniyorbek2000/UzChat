import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createThemeSchema, updateThemeSchema } from "./themes.schema";
import { themesService } from "./themes.service";

const router = Router();
router.use(requireAuth);

router.get("/popular", async (req: Request, res: Response) => {
  const themes = await themesService.listPopular();
  res.json(themes);
});

router.get("/mine", async (req: Request, res: Response) => {
  const themes = await themesService.listByUser(req.user!.sub);
  res.json(themes);
});

router.get("/search", async (req: Request, res: Response) => {
  const themes = await themesService.search((req.query.q as string) || "");
  res.json(themes);
});

router.get("/:themeId", async (req: Request, res: Response) => {
  const theme = await themesService.getTheme(req.params.themeId);
  res.json(theme);
});

router.post("/", validateBody(createThemeSchema), async (req: Request, res: Response) => {
  const theme = await themesService.createTheme(req.user!.sub, req.body);
  res.status(201).json(theme);
});

router.patch("/:themeId", validateBody(updateThemeSchema), async (req: Request, res: Response) => {
  const theme = await themesService.updateTheme(req.user!.sub, req.params.themeId, req.body);
  res.json(theme);
});

router.delete("/:themeId", async (req: Request, res: Response) => {
  await themesService.deleteTheme(req.user!.sub, req.params.themeId);
  res.status(204).send();
});

router.post("/:themeId/install", async (req: Request, res: Response) => {
  await themesService.installTheme(req.params.themeId);
  res.status(204).send();
});

export { router as themesRouter };
