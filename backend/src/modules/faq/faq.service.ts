import { prisma } from "../../config/prisma";

export const faqService = {
  async list(category?: string) {
    return prisma.faqArticle.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
  },

  async getCategories() {
    const articles = await prisma.faqArticle.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return articles.map((a) => a.category);
  },

  async search(query: string) {
    return prisma.faqArticle.findMany({
      where: {
        isActive: true,
        OR: [
          { question: { contains: query, mode: "insensitive" } },
          { answer: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { sortOrder: "asc" },
      take: 20,
    });
  },

  async create(data: { question: string; answer: string; category: string; sortOrder?: number }) {
    return prisma.faqArticle.create({ data });
  },

  async update(id: string, data: { question?: string; answer?: string; category?: string; sortOrder?: number; isActive?: boolean }) {
    return prisma.faqArticle.update({ where: { id }, data });
  },

  async remove(id: string) {
    await prisma.faqArticle.delete({ where: { id } });
  },
};
