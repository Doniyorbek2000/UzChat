import { randomBytes } from "crypto";
import { Prisma, QrPaymentStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateQrPaymentInput, PayQrInput } from "./qrPayments.schema";

const userSummarySelect = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
} as const;

export const qrPaymentsService = {
  async create(userId: string, input: CreateQrPaymentInput) {
    const qrCode = `UZCHAT_PAY_${randomBytes(16).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    return prisma.qrPayment.create({
      data: {
        creatorId: userId,
        amount: input.amount ?? null,
        currency: input.currency ?? "UZS",
        note: input.note ?? null,
        qrCode,
        expiresAt,
      },
      include: { creator: { select: userSummarySelect } },
    });
  },

  async getByCode(qrCode: string) {
    const qr = await prisma.qrPayment.findUnique({
      where: { qrCode },
      include: {
        creator: { select: userSummarySelect },
        payer: { select: userSummarySelect },
      },
    });
    if (!qr) throw Errors.notFound("QR to'lov");
    return qr;
  },

  async pay(payerId: string, input: PayQrInput) {
    const qr = await prisma.qrPayment.findUnique({
      where: { qrCode: input.qrCode },
      include: { creator: { select: userSummarySelect } },
    });

    if (!qr) throw Errors.notFound("QR to'lov");
    if (qr.status !== QrPaymentStatus.PENDING) throw Errors.badRequest("Bu QR to'lov allaqachon ishlatilgan");
    if (qr.expiresAt < new Date()) throw Errors.badRequest("QR to'lov muddati tugagan");
    if (qr.creatorId === payerId) throw Errors.badRequest("O'zingizning QR kodingizga to'lab bo'lmaydi");

    const amount = qr.amount ?? input.amount;
    if (!amount) throw Errors.badRequest("Summa ko'rsatilishi kerak");

    return prisma.$transaction(async (tx) => {
      const payer = await tx.user.findUnique({
        where: { id: payerId },
        select: { walletBalance: true },
      });
      if (!payer || payer.walletBalance.lt(new Prisma.Decimal(amount.toString()))) {
        throw Errors.badRequest("Hisobingizda yetarli mablag' yo'q");
      }

      await tx.user.update({
        where: { id: payerId },
        data: { walletBalance: { decrement: amount } },
      });
      await tx.user.update({
        where: { id: qr.creatorId },
        data: { walletBalance: { increment: amount } },
      });
      return tx.qrPayment.update({
        where: { id: qr.id },
        data: {
          payerId,
          status: QrPaymentStatus.COMPLETED,
          paidAt: new Date(),
          amount: amount,
        },
        include: {
          creator: { select: userSummarySelect },
          payer: { select: userSummarySelect },
        },
      });
    });
  },

  async cancel(userId: string, qrPaymentId: string) {
    const qr = await prisma.qrPayment.findUnique({ where: { id: qrPaymentId } });
    if (!qr) throw Errors.notFound("QR to'lov");
    if (qr.creatorId !== userId) throw Errors.forbidden();
    if (qr.status !== QrPaymentStatus.PENDING) throw Errors.badRequest("Bu QR to'lovni bekor qilib bo'lmaydi");

    return prisma.qrPayment.update({
      where: { id: qrPaymentId },
      data: { status: QrPaymentStatus.CANCELLED },
    });
  },

  async listMine(userId: string) {
    return prisma.qrPayment.findMany({
      where: { OR: [{ creatorId: userId }, { payerId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        creator: { select: userSummarySelect },
        payer: { select: userSummarySelect },
      },
    });
  },
};
