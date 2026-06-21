import path from "path";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { contactsService } from "../contacts/contacts.service";

const DANGEROUS_EXTENSIONS = new Set([
  "apk", "aab", "exe", "msi", "bat", "cmd", "ps1", "sh", "dll", "scr",
  "com", "vbs", "wsf", "jar", "deb", "rpm", "dmg", "pkg", "app", "ipa",
  "xapk", "pif", "cpl", "hta", "inf", "reg", "rgs", "sct", "wsc", "wsh",
]);

const DANGEROUS_MIME_TYPES = new Set([
  "application/vnd.android.package-archive",
  "application/x-msdownload",
  "application/x-executable",
  "application/x-msdos-program",
  "application/x-dosexec",
  "application/x-sh",
  "application/x-shellscript",
  "application/bat",
  "application/x-bat",
  "application/java-archive",
  "application/x-debian-package",
  "application/x-rpm",
  "application/x-apple-diskimage",
]);

export interface FileSecurityCheck {
  allowed: boolean;
  reason?: string;
  warning?: string;
}

export const fileSecurityService = {
  getExtension(filename: string): string {
    return path.extname(filename).toLowerCase().replace(".", "");
  },

  isDangerousExtension(ext: string): boolean {
    return DANGEROUS_EXTENSIONS.has(ext.toLowerCase());
  },

  isDangerousMimeType(mimeType: string): boolean {
    return DANGEROUS_MIME_TYPES.has(mimeType.toLowerCase());
  },

  async checkFileForRecipient(
    recipientId: string,
    senderId: string,
    filename: string,
    fileSize: number,
    mimeType?: string
  ): Promise<FileSecurityCheck> {
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        blockExecutableFiles: true,
        blockAllFiles: true,
        blockMediaFromStrangers: true,
        maxFileSize: true,
        allowedFileTypes: true,
        blockedFileTypes: true,
      },
    });

    if (!recipient) return { allowed: true };

    if (recipient.blockAllFiles) {
      return { allowed: false, reason: "Bu foydalanuvchi barcha fayl qabul qilishni o'chirib qo'ygan" };
    }

    if (recipient.blockMediaFromStrangers) {
      const isContact = await contactsService.areContacts(recipientId, senderId);
      if (!isContact) {
        return { allowed: false, reason: "Bu foydalanuvchi notanish odamlardan fayl qabul qilmaydi" };
      }
    }

    if (fileSize > recipient.maxFileSize) {
      const maxMB = Math.round(recipient.maxFileSize / (1024 * 1024));
      return { allowed: false, reason: `Fayl hajmi cheklangandan katta (max ${maxMB} MB)` };
    }

    const ext = this.getExtension(filename);

    if (recipient.blockedFileTypes.length > 0 && recipient.blockedFileTypes.includes(ext)) {
      return { allowed: false, reason: `".${ext}" tipidagi fayllar bloklangan` };
    }

    if (recipient.allowedFileTypes.length > 0 && !recipient.allowedFileTypes.includes(ext)) {
      return { allowed: false, reason: `".${ext}" tipidagi fayllar ruxsat etilgan ro'yxatda yo'q` };
    }

    if (recipient.blockExecutableFiles) {
      if (this.isDangerousExtension(ext)) {
        return {
          allowed: false,
          reason: `Xavfli fayl turi bloklangan: .${ext}`,
        };
      }
      if (mimeType && this.isDangerousMimeType(mimeType)) {
        return {
          allowed: false,
          reason: "Xavfli fayl turi bloklangan",
        };
      }
    }

    let warning: string | undefined;
    if (this.isDangerousExtension(ext)) {
      warning = `⚠️ Ogohlantirish: .${ext} fayllari qurilmangizga zarar yetkazishi mumkin. Faqat ishonchli manbalardan yuklang.`;
    }

    return { allowed: true, warning };
  },

  async checkUploadSafety(
    filename: string,
    fileSize: number,
    mimeType?: string
  ): Promise<FileSecurityCheck> {
    const ext = this.getExtension(filename);

    if (this.isDangerousExtension(ext)) {
      return {
        allowed: true,
        warning: `⚠️ Ogohlantirish: .${ext} faylini yuklayapsiz. Bu turdagi fayllar ba'zi qabul qiluvchilar tomonidan bloklanishi mumkin.`,
      };
    }

    if (mimeType && this.isDangerousMimeType(mimeType)) {
      return {
        allowed: true,
        warning: "⚠️ Ogohlantirish: Bu turdagi fayllar ba'zi qabul qiluvchilar tomonidan bloklanishi mumkin.",
      };
    }

    return { allowed: true };
  },

  async getSecuritySettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        blockExecutableFiles: true,
        blockAllFiles: true,
        blockMediaFromStrangers: true,
        maxFileSize: true,
        allowedFileTypes: true,
        blockedFileTypes: true,
        autoDownloadMedia: true,
        autoDownloadOnWifi: true,
        autoDownloadOnMobile: true,
      },
    });
    if (!user) throw Errors.notFound("Foydalanuvchi");
    return user;
  },

  async updateSecuritySettings(
    userId: string,
    input: {
      blockExecutableFiles?: boolean;
      blockAllFiles?: boolean;
      blockMediaFromStrangers?: boolean;
      maxFileSize?: number;
      allowedFileTypes?: string[];
      blockedFileTypes?: string[];
      autoDownloadMedia?: boolean;
      autoDownloadOnWifi?: boolean;
      autoDownloadOnMobile?: boolean;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        blockExecutableFiles: true,
        blockAllFiles: true,
        blockMediaFromStrangers: true,
        maxFileSize: true,
        allowedFileTypes: true,
        blockedFileTypes: true,
        autoDownloadMedia: true,
        autoDownloadOnWifi: true,
        autoDownloadOnMobile: true,
      },
    });
  },

  getDangerousExtensions(): string[] {
    return Array.from(DANGEROUS_EXTENSIONS);
  },
};
