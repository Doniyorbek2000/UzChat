import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "../../config/prisma";

const expo = new Expo();

export const pushService = {
  async registerToken(userId: string, token: string) {
    if (!Expo.isExpoPushToken(token)) return;
    await prisma.pushToken.upsert({
      where: { token },
      update: { userId },
      create: { userId, token },
    });
  },

  async removeToken(userId: string, token: string) {
    await prisma.pushToken.deleteMany({ where: { userId, token } });
  },

  async sendToUsers(
    userIds: string[],
    notification: { title: string; body: string; data?: Record<string, unknown>; silent?: boolean }
  ) {
    if (userIds.length === 0) return;

    const tokens = await prisma.pushToken.findMany({ where: { userId: { in: userIds } } });
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        title: notification.title,
        body: notification.body,
        data: notification.data ?? {},
        sound: notification.silent ? null : "default",
      }));

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
            await prisma.pushToken.deleteMany({ where: { token: chunk[i].to as string } });
          }
        }
      } catch {
        // push delivery is best-effort; online users already got the message via socket
      }
    }
  },
};
