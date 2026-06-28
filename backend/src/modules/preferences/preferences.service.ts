import { prisma } from "../../config/prisma";

export const preferencesService = {
  async getAll(userId: string) {
    const prefs = await prisma.appPreference.findMany({ where: { userId }, take: 100 });
    const map: Record<string, string> = {};
    for (const p of prefs) map[p.key] = p.value;
    return map;
  },

  async get(userId: string, key: string) {
    const pref = await prisma.appPreference.findUnique({
      where: { userId_key: { userId, key } },
    });
    return pref?.value ?? null;
  },

  async set(userId: string, key: string, value: string) {
    return prisma.appPreference.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value },
      update: { value },
    });
  },

  async setMany(userId: string, prefs: Record<string, string>) {
    const ops = Object.entries(prefs).map(([key, value]) =>
      prisma.appPreference.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, value },
        update: { value },
      })
    );
    await prisma.$transaction(ops);
  },

  async remove(userId: string, key: string) {
    await prisma.appPreference.deleteMany({ where: { userId, key } });
  },
};
