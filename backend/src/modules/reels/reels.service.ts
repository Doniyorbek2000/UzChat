import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateReelInput, ReelCommentInput } from "./reels.schema";

const authorSelect = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
} as const;

export const reelsService = {
  async create(authorId: string, input: CreateReelInput) {
    return prisma.reel.create({
      data: {
        authorId,
        videoUrl: input.videoUrl,
        thumbnailUrl: input.thumbnailUrl ?? null,
        caption: input.caption ?? null,
        duration: input.duration ?? 0,
        musicTitle: input.musicTitle ?? null,
        musicArtist: input.musicArtist ?? null,
        hashtags: input.hashtags ?? [],
      },
      include: { author: { select: authorSelect } },
    });
  },

  async getFeed(userId: string, cursor?: string) {
    return prisma.reel.findMany({
      where: { isPublic: true },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: authorSelect },
        likes: { where: { userId }, select: { id: true } },
      },
    });
  },

  async getTrending() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return prisma.reel.findMany({
      where: { isPublic: true, createdAt: { gte: weekAgo } },
      take: 50,
      orderBy: [{ likeCount: "desc" }, { viewCount: "desc" }],
      include: { author: { select: authorSelect } },
    });
  },

  async getByUser(userId: string, viewerId: string) {
    return prisma.reel.findMany({
      where: {
        authorId: userId,
        ...(userId !== viewerId ? { isPublic: true } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: authorSelect },
        likes: { where: { userId: viewerId }, select: { id: true } },
      },
    });
  },

  async getReel(reelId: string, viewerId: string) {
    const reel = await prisma.reel.findUnique({
      where: { id: reelId },
      include: {
        author: { select: authorSelect },
        likes: { where: { userId: viewerId }, select: { id: true } },
      },
    });
    if (!reel) throw Errors.notFound("Reel");
    return reel;
  },

  async view(reelId: string) {
    await prisma.reel.update({
      where: { id: reelId },
      data: { viewCount: { increment: 1 } },
    });
  },

  async toggleLike(userId: string, reelId: string) {
    const reel = await prisma.reel.findUnique({ where: { id: reelId } });
    if (!reel) throw Errors.notFound("Reel");

    const existing = await prisma.reelLike.findUnique({
      where: { reelId_userId: { reelId, userId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.reelLike.delete({ where: { id: existing.id } }),
        prisma.reel.update({ where: { id: reelId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return { liked: false };
    }

    await prisma.$transaction([
      prisma.reelLike.create({ data: { reelId, userId } }),
      prisma.reel.update({ where: { id: reelId }, data: { likeCount: { increment: 1 } } }),
    ]);
    return { liked: true };
  },

  async addComment(authorId: string, reelId: string, input: ReelCommentInput) {
    const reel = await prisma.reel.findUnique({ where: { id: reelId } });
    if (!reel) throw Errors.notFound("Reel");

    if (input.parentId) {
      const parent = await prisma.reelComment.findUnique({ where: { id: input.parentId } });
      if (!parent || parent.reelId !== reelId) throw Errors.notFound("Izoh");
    }

    const [comment] = await prisma.$transaction([
      prisma.reelComment.create({
        data: {
          reelId,
          authorId,
          text: input.text,
          parentId: input.parentId ?? null,
        },
        include: { author: { select: authorSelect } },
      }),
      prisma.reel.update({ where: { id: reelId }, data: { commentCount: { increment: 1 } } }),
    ]);
    return comment;
  },

  async getComments(reelId: string, cursor?: string) {
    return prisma.reelComment.findMany({
      where: { reelId, parentId: null },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: 30,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: authorSelect },
        replies: {
          take: 3,
          orderBy: { createdAt: "asc" },
          include: { author: { select: authorSelect } },
        },
      },
    });
  },

  async deleteComment(userId: string, commentId: string) {
    const comment = await prisma.reelComment.findUnique({ where: { id: commentId } });
    if (!comment) throw Errors.notFound("Izoh");

    const reel = await prisma.reel.findUnique({ where: { id: comment.reelId } });
    if (comment.authorId !== userId && reel?.authorId !== userId) throw Errors.forbidden();

    await prisma.$transaction([
      prisma.reelComment.delete({ where: { id: commentId } }),
      prisma.reel.update({ where: { id: comment.reelId }, data: { commentCount: { decrement: 1 } } }),
    ]);
  },

  async deleteReel(userId: string, reelId: string) {
    const reel = await prisma.reel.findUnique({ where: { id: reelId } });
    if (!reel) throw Errors.notFound("Reel");
    if (reel.authorId !== userId) throw Errors.forbidden();

    await prisma.reel.delete({ where: { id: reelId } });
  },
};
