import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { presenceService } from "../../services/presence.service";
import { moderationService } from "../../services/moderation.service";
import { CreateReelInput, ReelCommentInput } from "./reels.schema";

const authorSelect = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
} as const;

export const reelsService = {
  async create(authorId: string, input: CreateReelInput) {
    const mod = moderationService.checkAll(input.caption, ...(input.hashtags ?? []));
    if (!mod.ok) throw Errors.badRequest(mod.message ?? "Kontent qabul qilinmadi");

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

  // "For you" feed: engagement-weighted score decayed by age (Reddit/HN-style
  // hot ranking) instead of a plain chronological dump. `cursor` is a numeric
  // offset — scores shift between requests, so id-cursors can't be stable.
  // At larger scale the score should be precomputed by a job into a column.
  async getFeed(userId: string, cursor?: string) {
    const offset = Math.max(0, Number.parseInt(cursor ?? "0", 10) || 0);
    const take = 20;

    const ranked = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Reel"
      WHERE "isPublic" = true
      ORDER BY
        (("likeCount" * 4.0 + "commentCount" * 6.0 + "shareCount" * 8.0 + "viewCount" * 0.05 + 1.0)
          / POWER(GREATEST(EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 3600.0, 0) + 2.0, 1.5)) DESC,
        "createdAt" DESC
      LIMIT ${take} OFFSET ${offset}
    `;
    if (ranked.length === 0) return [];

    const ids = ranked.map((r) => r.id);
    const reels = await prisma.reel.findMany({
      where: { id: { in: ids } },
      include: {
        author: { select: authorSelect },
        likes: { where: { userId }, select: { id: true } },
      },
    });
    const byId = new Map(reels.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
  },

  // Chronological feed of people you actively follow-by-content (kept for a
  // "Latest" tab and as a fallback for clients that still send id cursors).
  async getLatest(userId: string, cursor?: string) {
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
      take: 50,
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

  // Counts at most one view per user per reel per 6 hours (Redis NX key), so
  // replays and reconnects don't inflate viewCount. Without Redis it degrades
  // to the old count-everything behaviour rather than dropping views.
  async view(reelId: string, userId: string) {
    const isFirstView = await presenceService.deduplicateAction(`reelview:${reelId}:${userId}`, 6 * 3600);
    if (!isFirstView) return;
    await prisma.reel
      .update({ where: { id: reelId }, data: { viewCount: { increment: 1 } } })
      .catch(() => {}); // reel may have been deleted between view and update
  },

  async share(userId: string, reelId: string) {
    const reel = await prisma.reel.findUnique({ where: { id: reelId }, select: { id: true, isPublic: true, authorId: true } });
    if (!reel || (!reel.isPublic && reel.authorId !== userId)) throw Errors.notFound("Reel");
    const updated = await prisma.reel.update({
      where: { id: reelId },
      data: { shareCount: { increment: 1 } },
      select: { id: true, shareCount: true },
    });
    return updated;
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
    const mod = moderationService.check(input.text);
    if (!mod.ok) throw Errors.badRequest(mod.message ?? "Izoh qabul qilinmadi");

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
