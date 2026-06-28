import { randomBytes } from "crypto";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateBotInput, UpdateBotInput, AddCommandInput } from "./bots.schema";

export const botsService = {
  async create(ownerId: string, input: CreateBotInput) {
    const existing = await prisma.bot.findUnique({ where: { username: input.username } });
    if (existing) throw Errors.conflict("Bu username allaqachon band");

    const token = `bot_${randomBytes(32).toString("hex")}`;
    return prisma.bot.create({
      data: {
        ownerId,
        username: input.username,
        displayName: input.displayName,
        description: input.description ?? null,
        avatarUrl: input.avatarUrl ?? null,
        token,
      },
      include: { commands: true },
    });
  },

  async update(ownerId: string, botId: string, input: UpdateBotInput) {
    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot) throw Errors.notFound("Bot");
    if (bot.ownerId !== ownerId) throw Errors.forbidden();

    return prisma.bot.update({
      where: { id: botId },
      data: {
        displayName: input.displayName,
        description: input.description,
        avatarUrl: input.avatarUrl,
        webhookUrl: input.webhookUrl,
        isInline: input.isInline,
      },
      include: { commands: true },
    });
  },

  async getBot(botId: string) {
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: { commands: true, owner: { select: { id: true, username: true, displayName: true } } },
    });
    if (!bot) throw Errors.notFound("Bot");
    return bot;
  },

  async getByUsername(username: string) {
    const bot = await prisma.bot.findUnique({
      where: { username },
      include: { commands: true, owner: { select: { id: true, username: true, displayName: true } } },
    });
    if (!bot) throw Errors.notFound("Bot");
    return bot;
  },

  async listMyBots(ownerId: string) {
    return prisma.bot.findMany({
      where: { ownerId },
      include: { commands: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  async search(query?: string) {
    return prisma.bot.findMany({
      where: {
        isActive: true,
        ...(query
          ? {
              OR: [
                { username: { contains: query, mode: "insensitive" as const } },
                { displayName: { contains: query, mode: "insensitive" as const } },
                { description: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: { commands: true },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
  },

  async regenerateToken(ownerId: string, botId: string) {
    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot) throw Errors.notFound("Bot");
    if (bot.ownerId !== ownerId) throw Errors.forbidden();

    const token = `bot_${randomBytes(32).toString("hex")}`;
    return prisma.bot.update({
      where: { id: botId },
      data: { token },
      select: { id: true, token: true },
    });
  },

  async addCommand(ownerId: string, botId: string, input: AddCommandInput) {
    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot) throw Errors.notFound("Bot");
    if (bot.ownerId !== ownerId) throw Errors.forbidden();

    const existing = await prisma.botCommand.findUnique({
      where: { botId_command: { botId, command: input.command } },
    });
    if (existing) throw Errors.conflict("Bu buyruq allaqachon mavjud");

    return prisma.botCommand.create({
      data: { botId, command: input.command, description: input.description },
    });
  },

  async removeCommand(ownerId: string, botId: string, commandId: string) {
    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot) throw Errors.notFound("Bot");
    if (bot.ownerId !== ownerId) throw Errors.forbidden();

    const cmd = await prisma.botCommand.findUnique({ where: { id: commandId } });
    if (!cmd || cmd.botId !== botId) throw Errors.notFound("Buyruq");

    await prisma.botCommand.delete({ where: { id: commandId } });
  },

  async deleteBot(ownerId: string, botId: string) {
    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot) throw Errors.notFound("Bot");
    if (bot.ownerId !== ownerId) throw Errors.forbidden();

    await prisma.bot.delete({ where: { id: botId } });
  },

  async toggleActive(ownerId: string, botId: string) {
    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot) throw Errors.notFound("Bot");
    if (bot.ownerId !== ownerId) throw Errors.forbidden();

    return prisma.bot.update({
      where: { id: botId },
      data: { isActive: !bot.isActive },
      include: { commands: true },
    });
  },
};
