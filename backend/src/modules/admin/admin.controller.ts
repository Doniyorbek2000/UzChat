import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { validateBody, validateQuery } from "../../utils/validate";
import { adminService } from "./admin.service";
import { prisma } from "../../config/prisma";

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(200).optional(),
});

const setAdminSchema = z.object({ isAdmin: z.boolean() });
const setVerifiedSchema = z.object({
  isVerified: z.boolean(),
  verifiedType: z.string().max(50).nullable().optional(),
});

function auditLog(adminId: string, action: string, targetType?: string, targetId?: string, details?: string, ip?: string) {
  prisma.adminAuditLog.create({
    data: { adminId, action, targetType, targetId, details, ip },
  }).catch(() => {});
}

router.get("/dashboard", async (_req: Request, res: Response) => {
  const stats = await adminService.getDashboardStats();
  res.json(stats);
});

router.get("/health", async (_req: Request, res: Response) => {
  const health = await adminService.getSystemHealth();
  res.json(health);
});

router.get("/users", validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as unknown as z.infer<typeof paginationSchema>;
  const result = await adminService.listUsers(page, limit, search);
  res.json(result);
});

router.get("/users/:userId", async (req: Request, res: Response) => {
  const user = await adminService.getUser(req.params.userId);
  res.json(user);
});

router.patch("/users/:userId/admin", validateBody(setAdminSchema), async (req: Request, res: Response) => {
  const user = await adminService.setUserAdmin(req.params.userId, req.body.isAdmin);
  auditLog(req.user!.sub, "SET_ADMIN", "user", req.params.userId, `isAdmin=${req.body.isAdmin}`, req.ip);
  res.json(user);
});

router.patch("/users/:userId/verify", validateBody(setVerifiedSchema), async (req: Request, res: Response) => {
  const user = await adminService.setUserVerified(req.params.userId, req.body.isVerified, req.body.verifiedType ?? null);
  auditLog(req.user!.sub, "SET_VERIFIED", "user", req.params.userId, `isVerified=${req.body.isVerified}`, req.ip);
  res.json(user);
});

router.delete("/users/:userId", async (req: Request, res: Response) => {
  await adminService.deleteUser(req.params.userId);
  auditLog(req.user!.sub, "DELETE_USER", "user", req.params.userId, undefined, req.ip);
  res.status(204).send();
});

router.get("/reports", validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page } = req.query as unknown as z.infer<typeof paginationSchema>;
  const result = await adminService.listReports(page);
  res.json(result);
});

router.patch("/reports/:reportId/resolve", async (req: Request, res: Response) => {
  const report = await adminService.resolveReport(req.params.reportId);
  auditLog(req.user!.sub, "RESOLVE_REPORT", "report", req.params.reportId, undefined, req.ip);
  res.json(report);
});

router.patch("/reports/:reportId/dismiss", async (req: Request, res: Response) => {
  const report = await adminService.dismissReport(req.params.reportId);
  auditLog(req.user!.sub, "DISMISS_REPORT", "report", req.params.reportId, undefined, req.ip);
  res.json(report);
});

router.get("/audit-log", validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as z.infer<typeof paginationSchema>;
  const result = await adminService.getAuditLog(page, limit);
  res.json(result);
});

router.get("/login-attempts", validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as z.infer<typeof paginationSchema>;
  const result = await adminService.getLoginAttempts(page, limit);
  res.json(result);
});

export { router as adminRouter };
