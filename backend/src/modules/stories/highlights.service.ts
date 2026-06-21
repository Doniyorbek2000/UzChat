import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

export const highlightsService = {
  async create(userId: string, input: { title: string; coverUrl?: string }) {
    const maxOrder = await prisma.storyHighlight.aggregate({ where: { userId }, _max: { order: true } });
    return prisma.storyHighlight.create({
      data: { userId, title: input.title, coverUrl: input.coverUrl, order: (maxOrder._max.order ?? -1) + 1 },
      include: { items: { orderBy: { order: "asc" } } },
    });
  },

  async update(userId: string, highlightId: string, input: { title?: string; coverUrl?: string }) {
    const highlight = await prisma.storyHighlight.findUnique({ where: { id: highlightId } });
    if (!highlight || highlight.userId !== userId) throw Errors.notFound("Highlight");
    return prisma.storyHighlight.update({
      where: { id: highlightId },
      data: input,
      include: { items: { orderBy: { order: "asc" } } },
    });
  },

  async delete(userId: string, highlightId: string) {
    const highlight = await prisma.storyHighlight.findUnique({ where: { id: highlightId } });
    if (!highlight || highlight.userId !== userId) throw Errors.notFound("Highlight");
    await prisma.storyHighlight.delete({ where: { id: highlightId } });
  },

  async addItem(userId: string, highlightId: string, input: { mediaUrl: string; mediaType?: string; caption?: string }) {
    const highlight = await prisma.storyHighlight.findUnique({ where: { id: highlightId } });
    if (!highlight || highlight.userId !== userId) throw Errors.notFound("Highlight");

    const maxOrder = await prisma.storyHighlightItem.aggregate({ where: { highlightId }, _max: { order: true } });
    return prisma.storyHighlightItem.create({
      data: {
        highlightId,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType ?? "IMAGE",
        caption: input.caption,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
  },

  async removeItem(userId: string, itemId: string) {
    const item = await prisma.storyHighlightItem.findUnique({
      where: { id: itemId },
      include: { highlight: true },
    });
    if (!item || item.highlight.userId !== userId) throw Errors.notFound("Element");
    await prisma.storyHighlightItem.delete({ where: { id: itemId } });
  },

  async listByUser(userId: string) {
    return prisma.storyHighlight.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      include: { items: { orderBy: { order: "asc" } } },
    });
  },

  async getHighlight(highlightId: string) {
    const highlight = await prisma.storyHighlight.findUnique({
      where: { id: highlightId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!highlight) throw Errors.notFound("Highlight");
    return highlight;
  },
};
