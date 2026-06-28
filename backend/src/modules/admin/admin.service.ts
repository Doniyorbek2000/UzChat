import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { pushService } from "../push/push.service";

const userSummarySelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  phone: true,
  isAdmin: true,
  isVerified: true,
  verifiedType: true,
  isBanned: true,
  banReason: true,
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
          reportedUser: { select: { id: true, username: true, displayName: true } },
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

  async listPosts(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? { content: { contains: search, mode: "insensitive" as const } }
      : {};
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);
    return { posts, total, page, totalPages: Math.ceil(total / limit) };
  },

  async deletePost(postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw Errors.notFound("Post topilmadi");
    await prisma.post.delete({ where: { id: postId } });
  },

  async listReels(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [reels, total] = await Promise.all([
      prisma.reel.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.reel.count(),
    ]);
    return { reels, total, page, totalPages: Math.ceil(total / limit) };
  },

  async deleteReel(reelId: string) {
    const reel = await prisma.reel.findUnique({ where: { id: reelId } });
    if (!reel) throw Errors.notFound("Reel topilmadi");
    await prisma.reel.delete({ where: { id: reelId } });
  },

  async listStories(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [stories, total] = await Promise.all([
      prisma.story.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count: { select: { views: true } },
        },
      }),
      prisma.story.count(),
    ]);
    return { stories, total, page, totalPages: Math.ceil(total / limit) };
  },

  async deleteStory(storyId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw Errors.notFound("Hikoya topilmadi");
    await prisma.story.delete({ where: { id: storyId } });
  },

  async banUser(userId: string, reason: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Errors.notFound("Foydalanuvchi topilmadi");
    if (user.isAdmin) throw Errors.forbidden("Admin foydalanuvchini bloklash mumkin emas");
    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { isBanned: true, banReason: reason },
        select: userSummarySelect,
      }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return updated;
  },

  async unbanUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Errors.notFound("Foydalanuvchi topilmadi");
    return prisma.user.update({
      where: { id: userId },
      data: { isBanned: false, banReason: null },
      select: userSummarySelect,
    });
  },

  async getContentStats() {
    const [postCount, reelCount, storyCount, reportPending] = await Promise.all([
      prisma.post.count(),
      prisma.reel.count(),
      prisma.story.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
    ]);
    return { posts: postCount, reels: reelCount, stories: storyCount, pendingReports: reportPending };
  },

  async listMarketplace(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [stores, totalStores, totalProducts, totalOrders] = await Promise.all([
      prisma.store.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          owner: { select: { id: true, username: true, displayName: true } },
          _count: { select: { products: true } },
        },
      }),
      prisma.store.count(),
      prisma.product.count(),
      prisma.order.count(),
    ]);
    return { stores, totalStores, totalProducts, totalOrders, page, totalPages: Math.ceil(totalStores / limit) };
  },

  async listPayments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [payments, totalTransactions] = await Promise.all([
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          sender: { select: { id: true, username: true, displayName: true } },
          receiver: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.payment.count(),
    ]);
    const totalVolume = await prisma.payment.aggregate({ _sum: { amount: true } });
    return { payments, totalTransactions, totalVolume: totalVolume._sum.amount ?? 0, page, totalPages: Math.ceil(totalTransactions / limit) };
  },

  async listCommunities(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          owner: { select: { id: true, username: true, displayName: true } },
          _count: { select: { groups: true } },
        },
      }),
      prisma.community.count(),
    ]);
    return { communities, total, page, totalPages: Math.ceil(total / limit) };
  },

  async listBots(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [bots, total] = await Promise.all([
      prisma.bot.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          owner: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.bot.count(),
    ]);
    return { bots, total, page, totalPages: Math.ceil(total / limit) };
  },

  async broadcastNotification(title: string, body: string, adminId: string) {
    const allUserIds = await prisma.user.findMany({
      where: { isBanned: false },
      select: { id: true },
    });
    const userIds = allUserIds.map((u) => u.id);

    await prisma.notificationLog.createMany({
      data: userIds.map((userId) => ({ userId, type: "BROADCAST", title, body })),
    });

    await pushService.sendToUsers(userIds, { title, body, data: { type: "broadcast" } });

    return { sentTo: userIds.length };
  },

  async getActivityStats() {
    const now = new Date();
    const days: { date: string; users: number; messages: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [users, messages] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.message.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
      ]);

      days.push({
        date: dayStart.toISOString().slice(0, 10),
        users,
        messages,
      });
    }

    const activeToday = await prisma.user.count({
      where: { lastSeenAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
    });

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const activeWeek = await prisma.user.count({
      where: { lastSeenAt: { gte: weekAgo } },
    });

    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const activeMonth = await prisma.user.count({
      where: { lastSeenAt: { gte: monthAgo } },
    });

    return { days, dau: activeToday, wau: activeWeek, mau: activeMonth };
  },

  async getOnlineUsers() {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [onlineCount, total] = await Promise.all([
      prisma.user.count({ where: { lastSeenAt: { gte: fiveMinAgo } } }),
      prisma.user.count(),
    ]);
    return { online: onlineCount, total };
  },

  async listBannedUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { isBanned: true },
        select: { ...userSummarySelect, walletBalance: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: { isBanned: true } }),
    ]);
    return { users, total, page, totalPages: Math.ceil(total / limit) };
  },

  async exportAuditLogCSV() {
    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10000,
      include: {
        admin: { select: { username: true, displayName: true } },
      },
    });

    const header = "id,adminUsername,adminName,action,targetType,targetId,details,ip,createdAt";
    const rows = logs.map((l) =>
      [l.id, l.admin.username, `"${(l.admin.displayName ?? "").replace(/"/g, '""')}"`, l.action, l.targetType ?? "", l.targetId ?? "", `"${(l.details ?? "").replace(/"/g, '""')}"`, l.ip ?? "", l.createdAt.toISOString()].join(",")
    );
    return [header, ...rows].join("\n");
  },

  async exportUsersCSV() {
    const users = await prisma.user.findMany({
      select: userSummarySelect,
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const header = "id,username,displayName,phone,isAdmin,isVerified,isBanned,createdAt,lastSeenAt";
    const rows = users.map((u) =>
      [u.id, u.username, `"${(u.displayName ?? "").replace(/"/g, '""')}"`, u.phone, u.isAdmin, u.isVerified, u.isBanned, u.createdAt.toISOString(), u.lastSeenAt?.toISOString() ?? ""].join(",")
    );
    return [header, ...rows].join("\n");
  },
};
