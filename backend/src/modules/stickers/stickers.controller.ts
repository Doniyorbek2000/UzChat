import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createStickerPackSchema, addStickerSchema } from "./stickers.schema";
import { stickersService } from "./stickers.service";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const query = req.query.q as string | undefined;
  const packs = await stickersService.listPacks(query);
  res.json(packs);
});

router.get("/featured", async (_req: Request, res: Response) => {
  const packs = await stickersService.listFeatured();
  res.json(packs);
});

router.get("/installed", async (req: Request, res: Response) => {
  const packs = await stickersService.listInstalled(req.user!.sub);
  res.json(packs);
});

router.get("/mine", async (req: Request, res: Response) => {
  const packs = await stickersService.listMyPacks(req.user!.sub);
  res.json(packs);
});

router.get("/:packId", async (req: Request, res: Response) => {
  const pack = await stickersService.getPack(req.params.packId);
  res.json(pack);
});

router.post("/", validateBody(createStickerPackSchema), async (req: Request, res: Response) => {
  const pack = await stickersService.createPack(req.user!.sub, req.body);
  res.status(201).json(pack);
});

router.post("/:packId/stickers", validateBody(addStickerSchema), async (req: Request, res: Response) => {
  const sticker = await stickersService.addSticker(req.user!.sub, req.params.packId, req.body);
  res.status(201).json(sticker);
});

router.delete("/:packId/stickers/:stickerId", async (req: Request, res: Response) => {
  await stickersService.removeSticker(req.user!.sub, req.params.stickerId);
  res.status(204).send();
});

router.post("/:packId/install", async (req: Request, res: Response) => {
  await stickersService.installPack(req.user!.sub, req.params.packId);
  res.status(204).send();
});

router.delete("/:packId/install", async (req: Request, res: Response) => {
  await stickersService.uninstallPack(req.user!.sub, req.params.packId);
  res.status(204).send();
});

router.delete("/:packId", async (req: Request, res: Response) => {
  await stickersService.deletePack(req.user!.sub, req.params.packId);
  res.status(204).send();
});

export { router as stickersRouter };
