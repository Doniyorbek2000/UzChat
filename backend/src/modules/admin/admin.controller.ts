import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { validateBody, validateQuery, uuidParamHandler } from "../../utils/validate";
import { Errors } from "../../utils/errors";
import { adminService } from "./admin.service";
import { prisma } from "../../config/prisma";
import { logger } from "../../utils/logger";

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);
router.param("userId", uuidParamHandler);
router.param("reportId", uuidParamHandler);
router.param("postId", uuidParamHandler);
router.param("reelId", uuidParamHandler);
router.param("storyId", uuidParamHandler);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(200).optional(),
});

const setAdminSchema = z.object({ isAdmin: z.boolean() });
const walletCreditSchema = z.object({
  amount: z.number().int().min(-50_000_000).max(50_000_000).refine((v) => v !== 0, { message: "Miqdor 0 bo'lmasligi kerak" }),
});
const setVerifiedSchema = z.object({
  isVerified: z.boolean(),
  verifiedType: z.string().max(50).nullable().optional(),
});

function auditLog(adminId: string, action: string, targetType?: string, targetId?: string, details?: string, ip?: string) {
  prisma.adminAuditLog.create({
    data: { adminId, action, targetType, targetId, details, ip },
  }).catch((err) => {
    logger.error("Admin audit log yozishda xatolik", { error: (err as Error).message, action, targetType, targetId });
  });
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
  if (req.params.userId === req.user!.sub && !req.body.isAdmin) throw Errors.badRequest("O'zingizdan admin huquqini olib tashlay olmaysiz");
  const user = await adminService.setUserAdmin(req.params.userId, req.body.isAdmin);
  auditLog(req.user!.sub, "SET_ADMIN", "user", req.params.userId, `isAdmin=${req.body.isAdmin}`, req.ip);
  res.json(user);
});

router.post("/users/:userId/wallet-credit", validateBody(walletCreditSchema), async (req: Request, res: Response) => {
  const result = await adminService.creditUserWallet(req.params.userId, req.body.amount);
  auditLog(req.user!.sub, "WALLET_CREDIT", "user", req.params.userId, `amount=${req.body.amount}`, req.ip);
  res.json(result);
});

router.patch("/users/:userId/verify", validateBody(setVerifiedSchema), async (req: Request, res: Response) => {
  const user = await adminService.setUserVerified(req.params.userId, req.body.isVerified, req.body.verifiedType ?? null);
  auditLog(req.user!.sub, "SET_VERIFIED", "user", req.params.userId, `isVerified=${req.body.isVerified}`, req.ip);
  res.json(user);
});

router.delete("/users/:userId", async (req: Request, res: Response) => {
  if (req.params.userId === req.user!.sub) throw Errors.badRequest("O'zingizni o'chirishingiz mumkin emas");
  await adminService.deleteUser(req.params.userId);
  auditLog(req.user!.sub, "DELETE_USER", "user", req.params.userId, undefined, req.ip);
  res.status(204).send();
});

router.get("/users/:userId/sessions", async (req: Request, res: Response) => {
  const sessions = await adminService.getUserSessions(req.params.userId);
  res.json({ sessions });
});

router.post("/users/:userId/revoke-sessions", async (req: Request, res: Response) => {
  const result = await adminService.revokeAllUserSessions(req.params.userId);
  auditLog(req.user!.sub, "REVOKE_SESSIONS", "user", req.params.userId, `revoked=${result.revoked}`, req.ip);
  res.json(result);
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

router.get("/content-stats", async (_req: Request, res: Response) => {
  const stats = await adminService.getContentStats();
  res.json(stats);
});

router.get("/posts", validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as unknown as z.infer<typeof paginationSchema>;
  const result = await adminService.listPosts(page, limit, search);
  res.json(result);
});

router.delete("/posts/:postId", async (req: Request, res: Response) => {
  await adminService.deletePost(req.params.postId);
  auditLog(req.user!.sub, "DELETE_POST", "post", req.params.postId, undefined, req.ip);
  res.status(204).send();
});

router.get("/reels", validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as z.infer<typeof paginationSchema>;
  const result = await adminService.listReels(page, limit);
  res.json(result);
});

router.delete("/reels/:reelId", async (req: Request, res: Response) => {
  await adminService.deleteReel(req.params.reelId);
  auditLog(req.user!.sub, "DELETE_REEL", "reel", req.params.reelId, undefined, req.ip);
  res.status(204).send();
});

router.get("/stories", validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as z.infer<typeof paginationSchema>;
  const result = await adminService.listStories(page, limit);
  res.json(result);
});

router.delete("/stories/:storyId", async (req: Request, res: Response) => {
  await adminService.deleteStory(req.params.storyId);
  auditLog(req.user!.sub, "DELETE_STORY", "story", req.params.storyId, undefined, req.ip);
  res.status(204).send();
});

const banSchema = z.object({ reason: z.string().min(1).max(500) });

router.patch("/users/:userId/ban", validateBody(banSchema), async (req: Request, res: Response) => {
  if (req.params.userId === req.user!.sub) throw Errors.badRequest("O'zingizni bloklashingiz mumkin emas");
  const user = await adminService.banUser(req.params.userId, req.body.reason);
  auditLog(req.user!.sub, "BAN_USER", "user", req.params.userId, req.body.reason, req.ip);
  res.json(user);
});

router.patch("/users/:userId/unban", async (req: Request, res: Response) => {
  const user = await adminService.unbanUser(req.params.userId);
  auditLog(req.user!.sub, "UNBAN_USER", "user", req.params.userId, undefined, req.ip);
  res.json(user);
});

router.get("/marketplace", validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as z.infer<typeof paginationSchema>;
  const result = await adminService.listMarketplace(page, limit);
  res.json(result);
});

router.get("/payments", validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as z.infer<typeof paginationSchema>;
  const result = await adminService.listPayments(page, limit);
  res.json(result);
});

router.get("/communities", validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as z.infer<typeof paginationSchema>;
  const result = await adminService.listCommunities(page, limit);
  res.json(result);
});

router.get("/bots", validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as z.infer<typeof paginationSchema>;
  const result = await adminService.listBots(page, limit);
  res.json(result);
});

const broadcastSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
});

router.post("/broadcast", validateBody(broadcastSchema), async (req: Request, res: Response) => {
  const result = await adminService.broadcastNotification(req.body.title, req.body.body, req.user!.sub);
  auditLog(req.user!.sub, "BROADCAST", undefined, undefined, `title=${req.body.title}`, req.ip);
  res.json(result);
});

router.get("/activity-stats", async (_req: Request, res: Response) => {
  const stats = await adminService.getActivityStats();
  res.json(stats);
});

router.get("/online-users", async (_req: Request, res: Response) => {
  const result = await adminService.getOnlineUsers();
  res.json(result);
});

router.get("/banned-users", validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as z.infer<typeof paginationSchema>;
  const result = await adminService.listBannedUsers(page, limit);
  res.json(result);
});

router.get("/export/users", async (_req: Request, res: Response) => {
  const csv = await adminService.exportUsersCSV();
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=users.csv");
  res.send(csv);
});

router.get("/export/audit-log", async (_req: Request, res: Response) => {
  const csv = await adminService.exportAuditLogCSV();
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=audit-log.csv");
  res.send(csv);
});

export { router as adminRouter };
