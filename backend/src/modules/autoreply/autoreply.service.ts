import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

export const autoReplyService = {
  async get(userId: string) {
    return prisma.autoReply.findUnique({ where: { userId } });
  },

  async upsert(userId: string, input: { isEnabled?: boolean; message?: string; startAt?: string; endAt?: string; onlyForStrangers?: boolean }) {
    return prisma.autoReply.upsert({
      where: { userId },
      create: {
        userId,
        message: input.message ?? "Hozirda band. Tez orada javob beraman.",
        isEnabled: input.isEnabled ?? false,
        startAt: input.startAt ? new Date(input.startAt) : undefined,
        endAt: input.endAt ? new Date(input.endAt) : undefined,
        onlyForStrangers: input.onlyForStrangers,
      },
      update: {
        ...input,
        startAt: input.startAt ? new Date(input.startAt) : undefined,
        endAt: input.endAt ? new Date(input.endAt) : undefined,
      },
    });
  },

  async shouldAutoReply(userId: string): Promise<string | null> {
    const ar = await prisma.autoReply.findUnique({ where: { userId } });
    if (!ar || !ar.isEnabled) return null;

    const now = new Date();
    if (ar.startAt && now < ar.startAt) return null;
    if (ar.endAt && now > ar.endAt) return null;

    return ar.message;
  },
};
