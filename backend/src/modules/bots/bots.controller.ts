import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateUuidParam } from "../../utils/validate";
import { createBotSchema, updateBotSchema, addCommandSchema } from "./bots.schema";
import { botsService } from "./bots.service";

const router = Router();
router.use(requireAuth);

router.get("/search", async (req: Request, res: Response) => {
  const bots = await botsService.search(req.query.q as string | undefined);
  res.json(bots);
});

router.get("/mine", async (req: Request, res: Response) => {
  const bots = await botsService.listMyBots(req.user!.sub);
  res.json(bots);
});

router.post("/", validateBody(createBotSchema), async (req: Request, res: Response) => {
  const bot = await botsService.create(req.user!.sub, req.body);
  res.status(201).json(bot);
});

router.get("/username/:username", async (req: Request, res: Response) => {
  const bot = await botsService.getByUsername(req.params.username);
  res.json(bot);
});

router.get("/:botId", validateUuidParam("botId"), async (req: Request, res: Response) => {
  const bot = await botsService.getBot(req.params.botId);
  res.json(bot);
});

router.patch("/:botId", validateUuidParam("botId"), validateBody(updateBotSchema), async (req: Request, res: Response) => {
  const bot = await botsService.update(req.user!.sub, req.params.botId, req.body);
  res.json(bot);
});

router.post("/:botId/regenerate-token", validateUuidParam("botId"), async (req: Request, res: Response) => {
  const result = await botsService.regenerateToken(req.user!.sub, req.params.botId);
  res.json(result);
});

router.post("/:botId/toggle-active", validateUuidParam("botId"), async (req: Request, res: Response) => {
  const bot = await botsService.toggleActive(req.user!.sub, req.params.botId);
  res.json(bot);
});

router.post("/:botId/commands", validateUuidParam("botId"), validateBody(addCommandSchema), async (req: Request, res: Response) => {
  const cmd = await botsService.addCommand(req.user!.sub, req.params.botId, req.body);
  res.status(201).json(cmd);
});

router.delete("/:botId/commands/:commandId", validateUuidParam("botId"), validateUuidParam("commandId"), async (req: Request, res: Response) => {
  await botsService.removeCommand(req.user!.sub, req.params.botId, req.params.commandId);
  res.status(204).send();
});

router.delete("/:botId", validateUuidParam("botId"), async (req: Request, res: Response) => {
  await botsService.deleteBot(req.user!.sub, req.params.botId);
  res.status(204).send();
});

export { router as botsRouter };
