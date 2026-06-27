import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { wishlistService } from "./wishlist.service";

const r = Router();
r.use(requireAuth);

r.get("/", async (req, res) => {
  const items = await wishlistService.getWishlist(req.user!.sub);
  res.json(items);
});

r.post("/:productId", async (req, res) => {
  const item = await wishlistService.addToWishlist(req.user!.sub, req.params.productId);
  res.status(201).json(item);
});

r.delete("/:productId", async (req, res) => {
  await wishlistService.removeFromWishlist(req.user!.sub, req.params.productId);
  res.status(204).send();
});

r.get("/:productId/check", async (req, res) => {
  const inWishlist = await wishlistService.isInWishlist(req.user!.sub, req.params.productId);
  res.json({ inWishlist });
});

export const wishlistRouter = r;
