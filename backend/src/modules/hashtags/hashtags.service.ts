import { prisma } from "../../config/prisma";

export const hashtagsService = {
  async getTrending(limit = 20) {
    return prisma.hashtag.findMany({
      orderBy: { postCount: "desc" },
      take: limit,
    });
  },

  async search(query: string) {
    return prisma.hashtag.findMany({
      where: { tag: { contains: query, mode: "insensitive" } },
      orderBy: { postCount: "desc" },
      take: 20,
    });
  },

  async getPostsByHashtag(tag: string, cursor?: string) {
    const hashtag = await prisma.hashtag.findUnique({ where: { tag } });
    if (!hashtag) return { posts: [], nextCursor: null };

    const hashtagPosts = await prisma.hashtagPost.findMany({
      where: { hashtagId: hashtag.id },
      orderBy: { createdAt: "desc" },
      take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        post: {
          include: {
            user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
    });

    const hasMore = hashtagPosts.length > 20;
    const items = hasMore ? hashtagPosts.slice(0, 20) : hashtagPosts;
    return {
      posts: items.map((hp) => hp.post),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  },

  async syncHashtags(postId: string, content: string) {
    const tags = content.match(/#[\wЀ-ӿа-яА-Я]+/g)?.map((t) => t.slice(1).toLowerCase()) ?? [];
    const uniqueTags = [...new Set(tags)];
    if (uniqueTags.length === 0) return;

    for (const tag of uniqueTags) {
      const hashtag = await prisma.hashtag.upsert({
        where: { tag },
        create: { tag, postCount: 1 },
        update: { postCount: { increment: 1 } },
      });
      await prisma.hashtagPost.upsert({
        where: { hashtagId_postId: { hashtagId: hashtag.id, postId } },
        create: { hashtagId: hashtag.id, postId },
        update: {},
      });
    }
  },
};
