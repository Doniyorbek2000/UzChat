import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateStoryInput } from "./stories.schema";
import { logger } from "../../utils/logger";
import { moderationService } from "../../services/moderation.service";

const STORY_DURATION_MS = 24 * 60 * 60 * 1000;

const userSummarySelect = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
} as const;

export const storiesService = {
  async createStory(userId: string, input: CreateStoryInput) {
    const mod = moderationService.check(input.caption);
    if (!mod.ok) throw Errors.badRequest(mod.message ?? "Hikoya qabul qilinmadi");

    const expiresAt = new Date(Date.now() + STORY_DURATION_MS);
    return prisma.story.create({
      data: {
        userId,
        mediaUrl: input.mediaUrl,
        caption: input.caption ?? null,
        expiresAt,
      },
      include: { user: { select: userSummarySelect }, views: { select: { userId: true } } },
    });
  },

  async deleteStory(userId: string, storyId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw Errors.notFound("Hikoya");
    if (story.userId !== userId) throw Errors.forbidden();
    await prisma.story.delete({ where: { id: storyId } });
  },

  async getFeed(userId: string) {
    const contacts = await prisma.contact.findMany({
      where: { ownerId: userId, status: "ACCEPTED" },
      select: { targetId: true },
      take: 500,
    });
    const contactIds = contacts.map((c) => c.targetId);
    contactIds.push(userId);

    const stories = await prisma.story.findMany({
      where: {
        userId: { in: contactIds },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        user: { select: userSummarySelect },
        views: { where: { userId }, select: { userId: true } },
      },
    });

    const grouped = new Map<string, { user: typeof stories[0]["user"]; stories: typeof stories }>();
    for (const story of stories) {
      if (!grouped.has(story.userId)) {
        grouped.set(story.userId, { user: story.user, stories: [] });
      }
      grouped.get(story.userId)!.stories.push(story);
    }

    return Array.from(grouped.values()).map((g) => ({
      user: g.user,
      stories: g.stories.map((s) => ({
        id: s.id,
        mediaUrl: s.mediaUrl,
        caption: s.caption,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        viewed: s.views.length > 0,
      })),
    }));
  },

  async viewStory(userId: string, storyId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw Errors.notFound("Hikoya");
    if (story.expiresAt < new Date()) throw Errors.notFound("Hikoya");

    await prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId } },
      create: { storyId, userId },
      update: {},
    });
  },

  async getViewers(userId: string, storyId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw Errors.notFound("Hikoya");
    if (story.userId !== userId) throw Errors.forbidden();

    return prisma.storyView.findMany({
      where: { storyId },
      orderBy: { viewedAt: "desc" },
      take: 200,
      include: { user: { select: userSummarySelect } },
    });
  },

  async expireStories() {
    const result = await prisma.story.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    if (result.count > 0) {
      logger.info("Story cleanup completed", { removed: result.count });
    }
    return result.count;
  },
};
