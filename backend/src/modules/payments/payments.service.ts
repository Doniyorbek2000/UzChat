import { PaymentStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { SendPaymentInput, TopUpInput } from "./payments.schema";

const userSummarySelect = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
} as const;

export const paymentsService = {
  async getBalance(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    return { balance: user?.walletBalance ?? 0, currency: "UZS" };
  },

  async topUp(userId: string, input: TopUpInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: input.amount } },
      select: { walletBalance: true },
    });
    return { balance: user.walletBalance, currency: "UZS" };
  },

  async sendPayment(senderId: string, input: SendPaymentInput) {
    if (senderId === input.receiverId) {
      throw Errors.badRequest("O'zingizga pul yuborib bo'lmaydi");
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { walletBalance: true },
    });
    if (!sender || sender.walletBalance < input.amount) {
      throw Errors.badRequest("Hisobingizda yetarli mablag' yo'q");
    }

    const receiver = await prisma.user.findUnique({
      where: { id: input.receiverId },
    });
    if (!receiver) throw Errors.notFound("Qabul qiluvchi");

    const payment = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: senderId },
        data: { walletBalance: { decrement: input.amount } },
      });
      await tx.user.update({
        where: { id: input.receiverId },
        data: { walletBalance: { increment: input.amount } },
      });
      return tx.payment.create({
        data: {
          senderId,
          receiverId: input.receiverId,
          amount: input.amount,
          currency: input.currency ?? "UZS",
          note: input.note ?? null,
          status: PaymentStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: {
          sender: { select: userSummarySelect },
          receiver: { select: userSummarySelect },
        },
      });
    });

    return payment;
  },

  async getHistory(userId: string) {
    return prisma.payment.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        sender: { select: userSummarySelect },
        receiver: { select: userSummarySelect },
      },
    });
  },
};
