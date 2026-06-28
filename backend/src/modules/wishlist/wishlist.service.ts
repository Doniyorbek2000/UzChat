import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

export const wishlistService = {
  async getWishlist(userId: string) {
    return prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        product: {
          include: {
            store: { select: { id: true, name: true } },
          },
        },
      },
    });
  },

  async addToWishlist(userId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw Errors.notFound("Mahsulot topilmadi");

    return prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
      include: { product: true },
    });
  },

  async removeFromWishlist(userId: string, productId: string) {
    await prisma.wishlist.deleteMany({ where: { userId, productId } });
  },

  async isInWishlist(userId: string, productId: string) {
    const item = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return !!item;
  },
};
