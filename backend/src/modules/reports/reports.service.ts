import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { chatsService } from "../chats/chats.service";
import { CreateReportInput } from "./reports.schema";

export const reportsService = {
  async create(reporterId: string, input: CreateReportInput) {
    if (input.reportedUserId === reporterId) {
      throw Errors.badRequest("O'zingizni shikoyat qila olmaysiz");
    }

    const reportedUser = await prisma.user.findUnique({ where: { id: input.reportedUserId } });
    if (!reportedUser) throw Errors.notFound("Foydalanuvchi");

    if (input.conversationId) {
      await chatsService.assertParticipant(reporterId, input.conversationId);
    }

    if (input.messageId) {
      const message = await prisma.message.findUnique({ where: { id: input.messageId } });
      if (!message || message.conversationId !== input.conversationId) {
        throw Errors.notFound("Xabar");
      }
      if (message.senderId !== input.reportedUserId) {
        throw Errors.badRequest("Xabar shikoyat qilinayotgan foydalanuvchiga tegishli emas");
      }
    }

    await prisma.report.create({
      data: {
        reporterId,
        reportedUserId: input.reportedUserId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        reason: input.reason,
        description: input.description,
      },
    });
  },
};
