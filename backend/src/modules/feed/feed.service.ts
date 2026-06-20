import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

const userSelect = { id: true, username: true, displayName: true, avatarUrl: true };

export const feedService = {
  async createPost(userId: string, data: { content?: string; mediaUrls?: string[]; visibility?: string }) {
    if (!data.content && (!data.mediaUrls || data.mediaUrls.length === 0)) {
      throw Errors.badRequest("Post matn yoki media bo'lishi kerak");
    }
    return prisma.post.create({
      data: {
        userId,
        content: data.content,
        mediaUrls: data.mediaUrls ?? [],
        visibility: (data.visibility as any) ?? "PUBLIC",
      },
      include: {
        user: { select: userSelect },
        _count: { select: { likes: true, comments: true } },
      },
    });
  },

  async getFeed(userId: string, cursor?: string, limit = 20) {
    const contacts = await prisma.contact.findMany({
      where: { ownerId: userId, status: "ACCEPTED" },
      select: { targetId: true },
    });
    const contactIds = contacts.map((c) => c.targetId);

    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { visibility: "PUBLIC" },
          { userId },
          { visibility: "CONTACTS", userId: { in: contactIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: userSelect },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { id: true }, take: 1 },
      },
    });

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    return {
      posts: posts.map((p) => ({
        ...p,
        isLiked: p.likes.length > 0,
        likes: undefined,
      })),
      nextCursor: hasMore ? posts[posts.length - 1]?.id : null,
    };
  },

  async getUserPosts(userId: string, viewerId: string, cursor?: string, limit = 20) {
    const isOwner = userId === viewerId;
    const isContact = !isOwner && await prisma.contact.findFirst({
      where: { ownerId: userId, targetId: viewerId, status: "ACCEPTED" },
    });

    const visibilityFilter = isOwner
      ? {}
      : isContact
        ? { visibility: { in: ["PUBLIC" as const, "CONTACTS" as const] } }
        : { visibility: "PUBLIC" as const };

    const posts = await prisma.post.findMany({
      where: { userId, ...visibilityFilter },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: userSelect },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: viewerId }, select: { id: true }, take: 1 },
      },
    });

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    return {
      posts: posts.map((p) => ({
        ...p,
        isLiked: p.likes.length > 0,
        likes: undefined,
      })),
      nextCursor: hasMore ? posts[posts.length - 1]?.id : null,
    };
  },

  async likePost(userId: string, postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw Errors.notFound("Post topilmadi");

    await prisma.postLike.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId },
      update: {},
    });
    return { liked: true };
  },

  async unlikePost(userId: string, postId: string) {
    await prisma.postLike.deleteMany({ where: { postId, userId } });
    return { liked: false };
  },

  async getComments(postId: string, cursor?: string, limit = 30) {
    const comments = await prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { user: { select: userSelect } },
    });

    const hasMore = comments.length > limit;
    if (hasMore) comments.pop();

    return { comments, nextCursor: hasMore ? comments[comments.length - 1]?.id : null };
  },

  async addComment(userId: string, postId: string, content: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw Errors.notFound("Post topilmadi");

    return prisma.postComment.create({
      data: { postId, userId, content },
      include: { user: { select: userSelect } },
    });
  },

  async deletePost(userId: string, postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw Errors.notFound("Post topilmadi");
    if (post.userId !== userId) throw Errors.forbidden("Bu sizning postingiz emas");
    await prisma.post.delete({ where: { id: postId } });
  },

  async deleteComment(userId: string, commentId: string) {
    const comment = await prisma.postComment.findUnique({ where: { id: commentId }, include: { post: true } });
    if (!comment) throw Errors.notFound("Izoh topilmadi");
    if (comment.userId !== userId && comment.post.userId !== userId) {
      throw Errors.forbidden("Bu izohni o'chira olmaysiz");
    }
    await prisma.postComment.delete({ where: { id: commentId } });
  },
};
