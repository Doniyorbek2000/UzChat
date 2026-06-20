import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { Product } from "@prisma/client";

const userSelect = { id: true, username: true, displayName: true, avatarUrl: true };

export const marketplaceService = {
  async createStore(userId: string, data: { name: string; description?: string; avatarUrl?: string; category?: string }) {
    return prisma.store.create({
      data: { ...data, ownerId: userId },
      include: { owner: { select: userSelect } },
    });
  },

  async updateStore(userId: string, storeId: string, data: { name?: string; description?: string; avatarUrl?: string; category?: string }) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw Errors.notFound("Do'kon");
    if (store.ownerId !== userId) throw Errors.forbidden("Not your store");
    return prisma.store.update({
      where: { id: storeId },
      data,
      include: { owner: { select: userSelect } },
    });
  },

  async listStores(category?: string, cursor?: string, limit = 20) {
    const stores = await prisma.store.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        owner: { select: userSelect },
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });
    const hasMore = stores.length > limit;
    if (hasMore) stores.pop();
    return { stores, nextCursor: hasMore ? stores[stores.length - 1]?.id : null };
  },

  async getMyStores(userId: string) {
    return prisma.store.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { products: true, orders: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async getStore(storeId: string) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: { select: userSelect }, _count: { select: { products: { where: { isActive: true } } } } },
    });
    if (!store) throw Errors.notFound("Do'kon");
    return store;
  },

  async addProduct(userId: string, storeId: string, data: { name: string; description?: string; price: number; currency?: string; imageUrls?: string[]; stock?: number; category?: string }) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw Errors.notFound("Do'kon");
    if (store.ownerId !== userId) throw Errors.forbidden("Not your store");
    return prisma.product.create({ data: { ...data, storeId } });
  },

  async updateProduct(userId: string, productId: string, data: { name?: string; description?: string; price?: number; imageUrls?: string[]; stock?: number; category?: string; isActive?: boolean }) {
    const product = await prisma.product.findUnique({ where: { id: productId }, include: { store: true } });
    if (!product) throw Errors.notFound("Mahsulot");
    if (product.store.ownerId !== userId) throw Errors.forbidden("Not your product");
    return prisma.product.update({ where: { id: productId }, data });
  },

  async deleteProduct(userId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId }, include: { store: true } });
    if (!product) throw Errors.notFound("Mahsulot");
    if (product.store.ownerId !== userId) throw Errors.forbidden("Not your product");
    await prisma.product.delete({ where: { id: productId } });
  },

  async listProducts(storeId: string, cursor?: string, limit = 20) {
    const products = await prisma.product.findMany({
      where: { storeId, isActive: true },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = products.length > limit;
    if (hasMore) products.pop();
    return { products, nextCursor: hasMore ? products[products.length - 1]?.id : null };
  },

  async searchProducts(query: string, category?: string, cursor?: string, limit = 20) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        store: { isActive: true },
        ...(category ? { category } : {}),
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { store: { select: { id: true, name: true, avatarUrl: true } } },
    });
    const hasMore = products.length > limit;
    if (hasMore) products.pop();
    return { products, nextCursor: hasMore ? products[products.length - 1]?.id : null };
  },

  async createOrder(userId: string, data: { storeId: string; items: { productId: string; quantity: number }[]; note?: string }) {
    const store = await prisma.store.findUnique({ where: { id: data.storeId } });
    if (!store) throw Errors.notFound("Do'kon");

    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, storeId: data.storeId } });
    const productMap = new Map<string, Product>(products.map((p) => [p.id, p]));

    let totalAmount = 0;
    const orderItems: { productId: string; quantity: number; price: number }[] = [];

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product) throw Errors.notFound("Mahsulot");
      if (!product.isActive) throw Errors.badRequest(`${product.name} mavjud emas`);
      if (product.stock < item.quantity) throw Errors.badRequest(`${product.name} uchun yetarli zaxira yo'q`);
      orderItems.push({ productId: product.id, quantity: item.quantity, price: product.price });
      totalAmount += product.price * item.quantity;
    }

    return prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return tx.order.create({
        data: {
          buyerId: userId,
          storeId: data.storeId,
          totalAmount,
          currency: products[0]?.currency ?? "UZS",
          note: data.note,
          items: { create: orderItems },
        },
        include: { items: { include: { product: true } }, store: { select: { id: true, name: true } } },
      });
    });
  },

  async getMyOrders(userId: string) {
    return prisma.order.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true } }, store: { select: { id: true, name: true, avatarUrl: true } } },
    });
  },

  async getStoreOrders(userId: string, storeId: string) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw Errors.notFound("Do'kon");
    if (store.ownerId !== userId) throw Errors.forbidden("Not your store");
    return prisma.order.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true } }, buyer: { select: userSelect } },
    });
  },

  async updateOrderStatus(userId: string, orderId: string, status: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { store: true } });
    if (!order) throw Errors.notFound("Buyurtma");
    if (order.store.ownerId !== userId && order.buyerId !== userId) {
      throw Errors.forbidden("Access denied");
    }
    if (order.buyerId === userId && status !== "CANCELLED") {
      throw Errors.forbidden("Buyers can only cancel orders");
    }
    return prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
      include: { items: { include: { product: true } }, store: { select: { id: true, name: true } } },
    });
  },
};
