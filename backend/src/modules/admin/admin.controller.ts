import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { adminService } from "./admin.service";

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get("/dashboard", async (_req: Request, res: Response) => {
  const stats = await adminService.getDashboardStats();
  res.json(stats);
});

router.get("/health", async (_req: Request, res: Response) => {
  const health = await adminService.getSystemHealth();
  res.json(health);
});

router.get("/users", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const search = req.query.search as string | undefined;
  const result = await adminService.listUsers(page, limit, search);
  res.json(result);
});

router.get("/users/:userId", async (req: Request, res: Response) => {
  const user = await adminService.getUser(req.params.userId);
  res.json(user);
});

router.patch("/users/:userId/admin", async (req: Request, res: Response) => {
  const { isAdmin } = req.body;
  const user = await adminService.setUserAdmin(req.params.userId, isAdmin === true);
  res.json(user);
});

router.patch("/users/:userId/verify", async (req: Request, res: Response) => {
  const { isVerified, verifiedType } = req.body;
  const user = await adminService.setUserVerified(req.params.userId, isVerified === true, verifiedType ?? null);
  res.json(user);
});

router.delete("/users/:userId", async (req: Request, res: Response) => {
  await adminService.deleteUser(req.params.userId);
  res.status(204).send();
});

router.get("/reports", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const result = await adminService.listReports(page);
  res.json(result);
});

router.patch("/reports/:reportId/resolve", async (req: Request, res: Response) => {
  const report = await adminService.resolveReport(req.params.reportId);
  res.json(report);
});

router.patch("/reports/:reportId/dismiss", async (req: Request, res: Response) => {
  const report = await adminService.dismissReport(req.params.reportId);
  res.json(report);
});

export { router as adminRouter };
