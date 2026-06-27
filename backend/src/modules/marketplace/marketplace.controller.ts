import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateQuery, validateUuidParam } from "../../utils/validate";
import { createStoreSchema, updateStoreSchema, createProductSchema, updateProductSchema, createOrderSchema, updateOrderStatusSchema } from "./marketplace.schema";
import { z } from "zod";

const cursorQuery = z.object({
  cursor: z.string().uuid().optional(),
  category: z.string().max(50).optional(),
  q: z.string().max(200).optional(),
}).passthrough();
import { marketplaceService } from "./marketplace.service";

const router = Router();

router.use(requireAuth);

// Stores
router.post("/stores", validateBody(createStoreSchema), async (req: Request, res: Response) => {
  const store = await marketplaceService.createStore(req.user!.sub, req.body);
  res.status(201).json(store);
});

router.get("/stores", validateQuery(cursorQuery), async (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const cursor = req.query.cursor as string | undefined;
  const result = await marketplaceService.listStores(category, cursor);
  res.json(result);
});

router.get("/stores/mine", async (req: Request, res: Response) => {
  const stores = await marketplaceService.getMyStores(req.user!.sub);
  res.json(stores);
});

router.get("/stores/:storeId", validateUuidParam("storeId"), async (req: Request, res: Response) => {
  const store = await marketplaceService.getStore(req.params.storeId);
  res.json(store);
});

router.patch("/stores/:storeId", validateUuidParam("storeId"), validateBody(updateStoreSchema), async (req: Request, res: Response) => {
  const store = await marketplaceService.updateStore(req.user!.sub, req.params.storeId, req.body);
  res.json(store);
});

// Products
router.post("/stores/:storeId/products", validateUuidParam("storeId"), validateBody(createProductSchema), async (req: Request, res: Response) => {
  const product = await marketplaceService.addProduct(req.user!.sub, req.params.storeId, req.body);
  res.status(201).json(product);
});

router.get("/stores/:storeId/products", validateUuidParam("storeId"), validateQuery(cursorQuery), async (req: Request, res: Response) => {
  const cursor = req.query.cursor as string | undefined;
  const result = await marketplaceService.listProducts(req.params.storeId, cursor);
  res.json(result);
});

router.patch("/products/:productId", validateUuidParam("productId"), validateBody(updateProductSchema), async (req: Request, res: Response) => {
  const product = await marketplaceService.updateProduct(req.user!.sub, req.params.productId, req.body);
  res.json(product);
});

router.delete("/products/:productId", validateUuidParam("productId"), async (req: Request, res: Response) => {
  await marketplaceService.deleteProduct(req.user!.sub, req.params.productId);
  res.status(204).send();
});

router.get("/products/search", validateQuery(cursorQuery), async (req: Request, res: Response) => {
  const query = (req.query.q as string) || "";
  const category = req.query.category as string | undefined;
  const cursor = req.query.cursor as string | undefined;
  const result = await marketplaceService.searchProducts(query, category, cursor);
  res.json(result);
});

// Orders
router.post("/orders", validateBody(createOrderSchema), async (req: Request, res: Response) => {
  const order = await marketplaceService.createOrder(req.user!.sub, req.body);
  res.status(201).json(order);
});

router.get("/orders/mine", async (req: Request, res: Response) => {
  const orders = await marketplaceService.getMyOrders(req.user!.sub);
  res.json(orders);
});

router.get("/orders/store/:storeId", validateUuidParam("storeId"), async (req: Request, res: Response) => {
  const orders = await marketplaceService.getStoreOrders(req.user!.sub, req.params.storeId);
  res.json(orders);
});

router.patch("/orders/:orderId/status", validateUuidParam("orderId"), validateBody(updateOrderStatusSchema), async (req: Request, res: Response) => {
  const order = await marketplaceService.updateOrderStatus(req.user!.sub, req.params.orderId, req.body.status);
  res.json(order);
});

export { router as marketplaceRouter };
