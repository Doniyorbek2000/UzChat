import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

const userSummarySelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  phone: true,
  isAdmin: true,
  isVerified: true,
  verifiedType: true,
  createdAt: true,
  lastSeenAt: true,
};

export const adminService = {
  async getDashboardStats() {
    const [userCount, conversationCount, messageCount, storeCount, orderCount, postCount] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.store.count(),
      prisma.order.count(),
      prisma.post.count(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [newUsersToday, messagesGrowth] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.message.count({ where: { createdAt: { gte: today } } }),
    ]);

    return {
      users: { total: userCount, newToday: newUsersToday },
      conversations: { total: conversationCount },
      messages: { total: messageCount, today: messagesGrowth },
      stores: { total: storeCount },
      orders: { total: orderCount },
      posts: { total: postCount },
    };
  },

  async listUsers(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { displayName: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          ...userSummarySelect,
          walletBalance: true,
          _count: { select: { participants: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, totalPages: Math.ceil(total / limit) };
  },

  async getUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...userSummarySelect,
        bio: true,
        walletBalance: true,
        _count: {
          select: {
            participants: true,
            messages: true,
            posts: true,
            stores: true,
            orders: true,
          },
        },
      },
    });
    if (!user) throw Errors.notFound("Foydalanuvchi topilmadi");
    return user;
  },

  async setUserAdmin(userId: string, isAdmin: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Errors.notFound("Foydalanuvchi topilmadi");
    return prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
      select: userSummarySelect,
    });
  },

  async setUserVerified(userId: string, isVerified: boolean, verifiedType: string | null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Errors.notFound("Foydalanuvchi topilmadi");
    return prisma.user.update({
      where: { id: userId },
      data: { isVerified, verifiedType },
      select: userSummarySelect,
    });
  },

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Errors.notFound("Foydalanuvchi topilmadi");
    if (user.isAdmin) throw Errors.forbidden("Admin foydalanuvchini o'chirish mumkin emas");
    await prisma.user.delete({ where: { id: userId } });
  },

  async listReports(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          reporter: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.report.count(),
    ]);
    return { reports, total, page, totalPages: Math.ceil(total / limit) };
  },

  async resolveReport(reportId: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw Errors.notFound("Shikoyat topilmadi");
    return prisma.report.update({
      where: { id: reportId },
      data: { status: "RESOLVED" },
    });
  },

  async dismissReport(reportId: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw Errors.notFound("Shikoyat topilmadi");
    return prisma.report.update({
      where: { id: reportId },
      data: { status: "DISMISSED" },
    });
  },

  async getSystemHealth() {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    return {
      status: "ok",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      dbLatencyMs: dbLatency,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };
  },

  async getAuditLog(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          admin: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.adminAuditLog.count(),
    ]);
    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  },

  async getLoginAttempts(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [attempts, total] = await Promise.all([
      prisma.loginAttempt.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.loginAttempt.count(),
    ]);
    return { attempts, total, page, totalPages: Math.ceil(total / limit) };
  },
};
