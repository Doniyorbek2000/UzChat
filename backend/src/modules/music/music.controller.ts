import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { uploadTrackSchema, createPlaylistSchema } from "./music.schema";
import { musicService } from "./music.service";

const router = Router();
router.use(requireAuth);

router.get("/trending", async (_req: Request, res: Response) => {
  const tracks = await musicService.getTrending();
  res.json(tracks);
});

router.get("/search", async (req: Request, res: Response) => {
  const tracks = await musicService.search(req.query.q as string ?? "");
  res.json(tracks);
});

router.post("/tracks", validateBody(uploadTrackSchema), async (req: Request, res: Response) => {
  const track = await musicService.upload(req.user!.sub, req.body);
  res.status(201).json(track);
});

router.post("/tracks/:trackId/play", async (req: Request, res: Response) => {
  await musicService.play(req.params.trackId);
  res.status(204).send();
});

router.post("/tracks/:trackId/like", async (req: Request, res: Response) => {
  const result = await musicService.toggleLike(req.user!.sub, req.params.trackId);
  res.json(result);
});

router.delete("/tracks/:trackId", async (req: Request, res: Response) => {
  await musicService.deleteTrack(req.user!.sub, req.params.trackId);
  res.status(204).send();
});

router.get("/playlists", async (req: Request, res: Response) => {
  const playlists = await musicService.getMyPlaylists(req.user!.sub);
  res.json(playlists);
});

router.post("/playlists", validateBody(createPlaylistSchema), async (req: Request, res: Response) => {
  const playlist = await musicService.createPlaylist(req.user!.sub, req.body);
  res.status(201).json(playlist);
});

router.get("/playlists/:playlistId/tracks", async (req: Request, res: Response) => {
  const tracks = await musicService.getPlaylistTracks(req.params.playlistId);
  res.json(tracks);
});

router.post("/playlists/:playlistId/tracks/:trackId", async (req: Request, res: Response) => {
  const pt = await musicService.addToPlaylist(req.user!.sub, req.params.playlistId, req.params.trackId);
  res.status(201).json(pt);
});

router.delete("/playlists/:playlistId/tracks/:trackId", async (req: Request, res: Response) => {
  await musicService.removeFromPlaylist(req.user!.sub, req.params.playlistId, req.params.trackId);
  res.status(204).send();
});

export { router as musicRouter };
