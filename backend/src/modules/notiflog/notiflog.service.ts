import { prisma } from "../../config/prisma";

export const notifLogService = {
  async getNotifications(userId: string, cursor?: string) {
    const items = await prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 31,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > 30;
    return {
      notifications: hasMore ? items.slice(0, 30) : items,
      nextCursor: hasMore ? items[29].id : null,
    };
  },

  async getUnreadCount(userId: string) {
    return prisma.notificationLog.count({ where: { userId, isRead: false } });
  },

  async markAsRead(userId: string, notificationId: string) {
    await prisma.notificationLog.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  },

  async markAllAsRead(userId: string) {
    await prisma.notificationLog.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },

  async log(userId: string, type: string, title: string, body: string, data?: string) {
    return prisma.notificationLog.create({
      data: { userId, type, title, body, data },
    });
  },

  async clearAll(userId: string) {
    await prisma.notificationLog.deleteMany({ where: { userId } });
  },
};
