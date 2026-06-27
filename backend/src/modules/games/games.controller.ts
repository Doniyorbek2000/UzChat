import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateUuidParam } from "../../utils/validate";
import { createGameSchema, submitScoreSchema } from "./games.schema";
import { gamesService } from "./games.service";

const router = Router();
router.use(requireAuth);

router.get("/popular", async (_req: Request, res: Response) => {
  const games = await gamesService.listPopular();
  res.json(games);
});

router.get("/category/:category", async (req: Request, res: Response) => {
  const games = await gamesService.listByCategory(req.params.category);
  res.json(games);
});

router.get("/mine", async (req: Request, res: Response) => {
  const games = await gamesService.getMyGames(req.user!.sub);
  res.json(games);
});

router.get("/:gameId", validateUuidParam("gameId"), async (req: Request, res: Response) => {
  const game = await gamesService.getGame(req.params.gameId);
  res.json(game);
});

router.post("/", validateBody(createGameSchema), async (req: Request, res: Response) => {
  const game = await gamesService.create(req.user!.sub, req.body);
  res.status(201).json(game);
});

router.post("/:gameId/play", validateUuidParam("gameId"), async (req: Request, res: Response) => {
  await gamesService.play(req.params.gameId);
  res.status(204).send();
});

router.post("/:gameId/score", validateUuidParam("gameId"), validateBody(submitScoreSchema), async (req: Request, res: Response) => {
  const score = await gamesService.submitScore(req.user!.sub, req.params.gameId, req.body.score);
  res.status(201).json(score);
});

router.get("/:gameId/leaderboard", validateUuidParam("gameId"), async (req: Request, res: Response) => {
  const lb = await gamesService.getLeaderboard(req.params.gameId);
  res.json(lb);
});

export { router as gamesRouter };
