import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { translateSchema } from "./translate.schema";
import { translateService } from "./translate.service";

const router = Router();
router.use(requireAuth);

router.get("/languages", async (_req: Request, res: Response) => {
  res.json(translateService.getSupportedLanguages());
});

router.post("/", validateBody(translateSchema), async (req: Request, res: Response) => {
  const result = await translateService.translateMessage(req.user!.sub, req.body.messageId, req.body.toLang);
  res.json(result);
});

export { router as translateRouter };
