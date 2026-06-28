import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { RegisterDeviceInput } from "./devices.schema";

export const devicesService = {
  async registerDevice(userId: string, input: RegisterDeviceInput) {
    return prisma.deviceKey.upsert({
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
  },

  async listDevices(userId: string) {
    return prisma.deviceKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, deviceId: true, publicKey: true, label: true, createdAt: true },
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
    await prisma.deviceKey.delete({ where: { id: device.id } });
  },
};
