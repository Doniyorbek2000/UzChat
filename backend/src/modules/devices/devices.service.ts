import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { getIo } from "../../sockets";
import { RegisterDeviceInput, UploadPreKeysInput, DistributeSenderKeyInput } from "./devices.schema";
import { logger } from "../../utils/logger";

const MIN_PREKEY_COUNT = 20;

export const devicesService = {
  async registerDevice(userId: string, input: RegisterDeviceInput) {
    const existing = await prisma.deviceKey.findUnique({
      where: { userId_deviceId: { userId, deviceId: input.deviceId } },
      select: { publicKey: true },
    });

    const keyChanged = existing && existing.publicKey !== input.publicKey;

    const device = await prisma.deviceKey.upsert({
      where: { userId_deviceId: { userId, deviceId: input.deviceId } },
      create: {
        userId,
        deviceId: input.deviceId,
        publicKey: input.publicKey,
        label: input.label ?? null,
      },
      update: {
        publicKey: input.publicKey,
        label: input.label ?? undefined,
      },
    });

    await prisma.keyTransparencyLog.create({
      data: {
        userId,
        deviceId: input.deviceId,
        publicKey: input.publicKey,
        action: keyChanged ? "KEY_CHANGE" : "REGISTER",
        serverSig: "",
      },
    });

    if (keyChanged) {
      this.notifyKeyChange(userId, input.deviceId).catch(() => {});
    }

    return device;
  },

  async listDevices(userId: string) {
    return prisma.deviceKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        deviceId: true,
        publicKey: true,
        label: true,
        createdAt: true,
        _count: { select: { preKeys: true } },
        signedPreKey: { select: { keyId: true, publicKey: true, signature: true } },
      },
    });
  },

  async getDeviceKeys(userId: string) {
    return prisma.deviceKey.findMany({
      where: { userId },
      take: 20,
      select: { deviceId: true, publicKey: true },
    });
  },

  async removeDevice(userId: string, deviceId: string) {
    const device = await prisma.deviceKey.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
    if (!device) throw Errors.notFound("Qurilma");

    await prisma.$transaction([
      prisma.preKey.deleteMany({ where: { deviceKeyId: device.id } }),
      prisma.signedPreKey.deleteMany({ where: { deviceKeyId: device.id } }),
      prisma.senderKeyStore.deleteMany({ where: { deviceKeyId: device.id } }),
      prisma.deviceKey.delete({ where: { id: device.id } }),
    ]);

    await prisma.keyTransparencyLog.create({
      data: {
        userId,
        deviceId,
        publicKey: device.publicKey,
        action: "REMOVE",
        serverSig: "",
      },
    });
  },

  async uploadPreKeys(userId: string, deviceId: string, input: UploadPreKeysInput) {
    const device = await prisma.deviceKey.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
    if (!device) throw Errors.notFound("Qurilma");

    await prisma.$transaction([
      ...input.preKeys.map((pk) =>
        prisma.preKey.upsert({
          where: { deviceKeyId_keyId: { deviceKeyId: device.id, keyId: pk.keyId } },
          create: { deviceKeyId: device.id, keyId: pk.keyId, publicKey: pk.publicKey },
          update: { publicKey: pk.publicKey },
        })
      ),
      prisma.signedPreKey.upsert({
        where: { deviceKeyId: device.id },
        create: {
          deviceKeyId: device.id,
          keyId: input.signedPreKey.keyId,
          publicKey: input.signedPreKey.publicKey,
          signature: input.signedPreKey.signature,
        },
        update: {
          keyId: input.signedPreKey.keyId,
          publicKey: input.signedPreKey.publicKey,
          signature: input.signedPreKey.signature,
        },
      }),
    ]);

    logger.info("PreKeys uploaded", { userId, deviceId, count: input.preKeys.length });
    return { uploaded: input.preKeys.length };
  },

  async getPreKeyBundle(targetUserId: string, targetDeviceId: string) {
    const device = await prisma.deviceKey.findUnique({
      where: { userId_deviceId: { userId: targetUserId, deviceId: targetDeviceId } },
      include: { signedPreKey: true },
    });
    if (!device) throw Errors.notFound("Qurilma");

    const oneTimePreKey = await prisma.preKey.findFirst({
      where: { deviceKeyId: device.id },
      orderBy: { keyId: "asc" },
    });

    if (oneTimePreKey) {
      await prisma.preKey.delete({ where: { id: oneTimePreKey.id } });

      const remaining = await prisma.preKey.count({ where: { deviceKeyId: device.id } });
      if (remaining < MIN_PREKEY_COUNT) {
        logger.warn("PreKey count low", { userId: targetUserId, deviceId: targetDeviceId, remaining });
      }
    }

    return {
      identityKey: device.publicKey,
      deviceId: device.deviceId,
      signedPreKey: device.signedPreKey
        ? { keyId: device.signedPreKey.keyId, publicKey: device.signedPreKey.publicKey, signature: device.signedPreKey.signature }
        : null,
      preKey: oneTimePreKey
        ? { keyId: oneTimePreKey.keyId, publicKey: oneTimePreKey.publicKey }
        : null,
    };
  },

  async getPreKeyBundles(targetUserId: string) {
    const devices = await prisma.deviceKey.findMany({
      where: { userId: targetUserId },
      take: 20,
    });

    const bundles = await Promise.all(
      devices.map((d) => this.getPreKeyBundle(targetUserId, d.deviceId).catch(() => null))
    );
    return bundles.filter(Boolean);
  },

  async getPreKeyCount(userId: string, deviceId: string) {
    const device = await prisma.deviceKey.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
    if (!device) return { count: 0, needsRefill: true };

    const count = await prisma.preKey.count({ where: { deviceKeyId: device.id } });
    return { count, needsRefill: count < MIN_PREKEY_COUNT };
  },

  async distributeSenderKey(userId: string, deviceId: string, input: DistributeSenderKeyInput) {
    const device = await prisma.deviceKey.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
    if (!device) throw Errors.notFound("Qurilma");

    await prisma.senderKeyStore.upsert({
      where: { deviceKeyId_conversationId: { deviceKeyId: device.id, conversationId: input.conversationId } },
      create: {
        deviceKeyId: device.id,
        conversationId: input.conversationId,
        distributionId: input.distributionId,
        senderKeyData: input.senderKeyData,
      },
      update: {
        distributionId: input.distributionId,
        senderKeyData: input.senderKeyData,
      },
    });

    return { distributed: true };
  },

  async getSenderKeys(conversationId: string) {
    return prisma.senderKeyStore.findMany({
      where: { conversationId },
      include: {
        deviceKey: { select: { userId: true, deviceId: true, publicKey: true } },
      },
    });
  },

  async getKeyTransparencyLog(userId: string, limit = 50) {
    return prisma.keyTransparencyLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async notifyKeyChange(userId: string, deviceId: string) {
    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true, conversation: { select: { type: true } } },
      take: 500,
    });

    const directConvs = conversations.filter((c) => c.conversation.type === "DIRECT");

    for (const conv of directConvs) {
      const otherParticipant = await prisma.conversationParticipant.findFirst({
        where: { conversationId: conv.conversationId, userId: { not: userId } },
        select: { userId: true },
      });

      if (otherParticipant) {
        try {
          getIo().to(`user:${otherParticipant.userId}`).emit("key:changed", {
            userId,
            deviceId,
            conversationId: conv.conversationId,
          });
        } catch {}
      }
    }
  },
};
