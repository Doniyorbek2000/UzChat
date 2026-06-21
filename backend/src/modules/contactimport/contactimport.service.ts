import { createHash } from "crypto";
import { prisma } from "../../config/prisma";

function hashPhone(phone: string): string {
  return createHash("sha256").update(phone.replace(/\D/g, "")).digest("hex");
}

export const contactImportService = {
  async importContacts(userId: string, contacts: { phone: string; displayName?: string }[]) {
    const results: { phone: string; matched: boolean; userId?: string; displayName?: string }[] = [];

    for (const c of contacts) {
      const ph = hashPhone(c.phone);
      const matchedUser = await prisma.user.findFirst({
        where: { phone: c.phone.replace(/\D/g, "") },
        select: { id: true, displayName: true, username: true },
      });

      await prisma.contactImport.upsert({
        where: { userId_phoneHash: { userId, phoneHash: ph } },
        create: { userId, phoneHash: ph, matchedUserId: matchedUser?.id, displayName: c.displayName },
        update: { matchedUserId: matchedUser?.id, displayName: c.displayName },
      });

      results.push({
        phone: c.phone,
        matched: !!matchedUser,
        userId: matchedUser?.id,
        displayName: matchedUser?.displayName ?? c.displayName,
      });
    }

    return results;
  },

  async getImportedContacts(userId: string) {
    return prisma.contactImport.findMany({
      where: { userId, matchedUserId: { not: null } },
      orderBy: { createdAt: "desc" },
    });
  },

  async clearImported(userId: string) {
    await prisma.contactImport.deleteMany({ where: { userId } });
  },
};
