import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateThemeInput, UpdateThemeInput } from "./themes.schema";

export const themesService = {
  async listPopular() {
    return prisma.sharedTheme.findMany({
      where: { isPublic: true },
      include: { creator: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
      orderBy: { installCount: "desc" },
    });
  },

  async listByUser(userId: string) {
    return prisma.sharedTheme.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async search(query: string) {
    return prisma.sharedTheme.findMany({
      where: {
        isPublic: true,
        name: { contains: query, mode: "insensitive" },
      },
      include: { creator: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
      orderBy: { installCount: "desc" },
    });
  },

  async getTheme(themeId: string) {
    const theme = await prisma.sharedTheme.findUnique({
      where: { id: themeId },
      include: { creator: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
    });
    if (!theme) throw Errors.notFound("Mavzu");
    return theme;
  },

  async createTheme(creatorId: string, input: CreateThemeInput) {
    return prisma.sharedTheme.create({
      data: {
        creatorId,
        name: input.name,
        description: input.description,
        primaryColor: input.primaryColor,
        backgroundColor: input.backgroundColor,
        surfaceColor: input.surfaceColor,
        textColor: input.textColor,
        accentColor: input.accentColor,
        isDark: input.isDark,
        wallpaperUrl: input.wallpaperUrl,
      },
    });
  },

  async updateTheme(creatorId: string, themeId: string, input: UpdateThemeInput) {
    const theme = await prisma.sharedTheme.findUnique({ where: { id: themeId } });
    if (!theme || theme.creatorId !== creatorId) throw Errors.notFound("Mavzu");

    return prisma.sharedTheme.update({
      where: { id: themeId },
      data: input,
    });
  },

  async deleteTheme(creatorId: string, themeId: string) {
    const theme = await prisma.sharedTheme.findUnique({ where: { id: themeId } });
    if (!theme || theme.creatorId !== creatorId) throw Errors.notFound("Mavzu");

    await prisma.sharedTheme.delete({ where: { id: themeId } });
  },

  async installTheme(themeId: string) {
    const theme = await prisma.sharedTheme.findUnique({ where: { id: themeId } });
    if (!theme) throw Errors.notFound("Mavzu");

    await prisma.sharedTheme.update({
      where: { id: themeId },
      data: { installCount: { increment: 1 } },
    });
  },
};
