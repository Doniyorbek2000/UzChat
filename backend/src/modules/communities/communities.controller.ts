import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createCommunitySchema, updateCommunitySchema, addGroupSchema } from "./communities.schema";
import { communitiesService } from "./communities.service";

const router = Router();
router.use(requireAuth);

router.get("/mine", async (req: Request, res: Response) => {
  const communities = await communitiesService.listMyCommunities(req.user!.sub);
  res.json(communities);
});

router.get("/:communityId", async (req: Request, res: Response) => {
  const community = await communitiesService.getCommunity(req.params.communityId);
  res.json(community);
});

router.post("/", validateBody(createCommunitySchema), async (req: Request, res: Response) => {
  const community = await communitiesService.createCommunity(req.user!.sub, req.body);
  res.status(201).json(community);
});

router.patch("/:communityId", validateBody(updateCommunitySchema), async (req: Request, res: Response) => {
  const community = await communitiesService.updateCommunity(req.user!.sub, req.params.communityId, req.body);
  res.json(community);
});

router.delete("/:communityId", async (req: Request, res: Response) => {
  await communitiesService.deleteCommunity(req.user!.sub, req.params.communityId);
  res.status(204).send();
});

router.post("/:communityId/groups", validateBody(addGroupSchema), async (req: Request, res: Response) => {
  const group = await communitiesService.addGroup(req.user!.sub, req.params.communityId, req.body.conversationId);
  res.status(201).json(group);
});

router.delete("/:communityId/groups/:conversationId", async (req: Request, res: Response) => {
  await communitiesService.removeGroup(req.user!.sub, req.params.communityId, req.params.conversationId);
  res.status(204).send();
});

export { router as communitiesRouter };
