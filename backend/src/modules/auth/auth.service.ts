import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import {
  signAccessToken,
  signRefreshToken,
  signTwoFactorPendingToken,
  verifyRefreshToken,
  verifyTwoFactorPendingToken,
} from "../../utils/jwt";
import { hashPassword, verifyPassword } from "../../utils/password";
import {
  generateOtpCode,
  hashOtpCode,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  sendOtpSms,
  verifyOtpCode,
} from "../../utils/otp";
import {
  LoginInput,
  RequestOtpInput,
  RequestPasswordResetInput,
  RequestPhoneChangeInput,
  ResetPasswordInput,
  VerifyOtpInput,
  VerifyPhoneChangeInput,
  VerifyTwoFactorInput,
  VerifyTwoFactorRecoveryInput,
  usernameSchema,
} from "./auth.schema";
import { env } from "../../config/env";
import { pushService } from "../push/push.service";
import { formatDeviceName } from "../../utils/device";

function msFromExpiresIn(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 86_400_000;
  return value * unitMs;
}

async function issueTokens(user: { id: string; username: string }, userAgent?: string | null) {
  const sid = crypto.randomUUID();
  const accessToken = signAccessToken({ sub: user.id, username: user.username, sid });
  const refreshToken = signRefreshToken({ sub: user.id, username: user.username, sid });

  await prisma.refreshToken.create({
    data: {
      id: sid,
      token: refreshToken,
      userId: user.id,
      userAgent: userAgent ?? null,
      expiresAt: new Date(Date.now() + msFromExpiresIn(env.jwt.refreshExpiresIn)),
    },
  });

  return { accessToken, refreshToken };
}

// Alerts the user's other devices that a new session was started, in case
// their account credentials were compromised.
function notifyNewLogin(userId: string, userAgent?: string | null) {
  pushService
    .sendToUsers([userId], {
      title: "Yangi kirish",
      body: `Hisobingizga ${formatDeviceName(userAgent)} orqali yangi kirish amalga oshirildi`,
      data: { type: "security" },
    })
    .catch(() => {});
}

// Prevents an OTP from being resent for the same phone number too soon
// after the previous one, regardless of which flow requested it.
async function assertOtpCooldown(phone: string) {
  const recent = await prisma.otpCode.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent) {
    const remainingMs = OTP_RESEND_COOLDOWN_MS - (Date.now() - recent.createdAt.getTime());
    if (remainingMs > 0) {
      throw Errors.tooManyRequests(`Qaytadan urinishdan oldin ${Math.ceil(remainingMs / 1000)} soniya kuting`);
    }
  }
}

function toPublicUser(user: {
  id: string;
  phone: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  publicKey: string;
}) {
  return {
    id: user.id,
    phone: user.phone,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    publicKey: user.publicKey,
  };
}

export const authService = {
  async isUsernameAvailable(username: string) {
    if (!usernameSchema.safeParse(username).success) return false;
    const existing = await prisma.user.findUnique({ where: { username } });
    return !existing;
  },

  async requestRegistrationOtp({ phone }: RequestOtpInput) {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw Errors.conflict("Bu telefon raqam allaqachon ro'yxatdan o'tgan");
    }

    await assertOtpCooldown(phone);

    const code = generateOtpCode();
    const codeHash = await hashOtpCode(code);

    await prisma.otpCode.create({
      data: {
        phone,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await sendOtpSms(phone, code);
  },

  async verifyOtpAndRegister(input: VerifyOtpInput, userAgent?: string | null) {
    const { phone, code, username, displayName, password, publicKey } = input;

    const otp = await prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw Errors.badRequest("Tasdiqlash kodi muddati o'tgan, qaytadan so'rang");
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw Errors.badRequest("Urinishlar soni tugadi, qaytadan so'rang");
    }

    const valid = await verifyOtpCode(code, otp.codeHash);
    if (!valid) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw Errors.badRequest("Tasdiqlash kodi noto'g'ri");
    }

    const [existingPhone, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { phone } }),
      prisma.user.findUnique({ where: { username } }),
    ]);
    if (existingPhone) throw Errors.conflict("Bu telefon raqam allaqachon ro'yxatdan o'tgan");
    if (existingUsername) throw Errors.conflict("Bu username band");

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { phone, username, displayName, passwordHash, publicKey },
    });

    await prisma.otpCode.delete({ where: { id: otp.id } });

    const tokens = await issueTokens(user, userAgent);
    return { user: toPublicUser(user), ...tokens };
  },

  async login({ phone, password }: LoginInput, userAgent?: string | null) {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) throw Errors.invalidCredentials();

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw Errors.invalidCredentials();

    if (user.twoFactorHash) {
      const pendingToken = signTwoFactorPendingToken(user.id);
      return { requires2FA: true as const, pendingToken, hint: user.twoFactorHint };
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });

    const tokens = await issueTokens(user, userAgent);
    notifyNewLogin(user.id, userAgent);
    return { user: toPublicUser(user), ...tokens };
  },

  async verifyTwoFactor({ pendingToken, password }: VerifyTwoFactorInput, userAgent?: string | null) {
    let payload;
    try {
      payload = verifyTwoFactorPendingToken(pendingToken);
    } catch {
      throw Errors.unauthorized();
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.twoFactorHash) throw Errors.unauthorized();

    const valid = await verifyPassword(password, user.twoFactorHash);
    if (!valid) throw Errors.badRequest("Ikki bosqichli parol noto'g'ri");

    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });

    const tokens = await issueTokens(user, userAgent);
    notifyNewLogin(user.id, userAgent);
    return { user: toPublicUser(user), ...tokens };
  },

  async refresh(refreshToken: string, userAgent?: string | null) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw Errors.unauthorized();
    }

    if (!payload.sid) throw Errors.unauthorized();

    const stored = await prisma.refreshToken.findUnique({ where: { id: payload.sid } });
    if (!stored || stored.token !== refreshToken || stored.revokedAt || stored.expiresAt < new Date()) {
      throw Errors.unauthorized();
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw Errors.unauthorized();

    const accessToken = signAccessToken({ sub: user.id, username: user.username, sid: stored.id });
    const newRefreshToken = signRefreshToken({ sub: user.id, username: user.username, sid: stored.id });

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + msFromExpiresIn(env.jwt.refreshExpiresIn)),
        lastUsedAt: new Date(),
        ...(userAgent ? { userAgent } : {}),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(refreshToken: string) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async listSessions(userId: string, currentSessionId?: string) {
    const sessions = await prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
    });
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      isCurrent: s.id === currentSessionId,
    }));
  },

  async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.refreshToken.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId || session.revokedAt) {
      throw Errors.notFound("Seans");
    }
    await prisma.refreshToken.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  },

  async revokeOtherSessions(userId: string, currentSessionId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, id: { not: currentSessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async requestPhoneChange(userId: string, { newPhone }: RequestPhoneChangeInput) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!user) throw Errors.notFound("Foydalanuvchi");
    if (user.phone === newPhone) throw Errors.badRequest("Bu sizning joriy raqamingiz");

    const existing = await prisma.user.findUnique({ where: { phone: newPhone } });
    if (existing) throw Errors.conflict("Bu telefon raqam allaqachon ro'yxatdan o'tgan");

    await assertOtpCooldown(newPhone);

    const code = generateOtpCode();
    const codeHash = await hashOtpCode(code);

    await prisma.otpCode.create({
      data: { phone: newPhone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });

    await sendOtpSms(newPhone, code);
  },

  async verifyPhoneChange(userId: string, { newPhone, code }: VerifyPhoneChangeInput) {
    const otp = await prisma.otpCode.findFirst({
      where: { phone: newPhone },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw Errors.badRequest("Tasdiqlash kodi muddati o'tgan, qaytadan so'rang");
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw Errors.badRequest("Urinishlar soni tugadi, qaytadan so'rang");
    }

    const valid = await verifyOtpCode(code, otp.codeHash);
    if (!valid) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw Errors.badRequest("Tasdiqlash kodi noto'g'ri");
    }

    const existing = await prisma.user.findUnique({ where: { phone: newPhone } });
    if (existing) throw Errors.conflict("Bu telefon raqam allaqachon ro'yxatdan o'tgan");

    const user = await prisma.user.update({ where: { id: userId }, data: { phone: newPhone } });
    await prisma.otpCode.delete({ where: { id: otp.id } });

    pushService
      .sendToUsers([userId], {
        title: "Telefon raqami o'zgartirildi",
        body: `Hisobingizning telefon raqami ${user.phone} ga o'zgartirildi`,
        data: { type: "security" },
      })
      .catch(() => {});

    return { phone: user.phone };
  },

  // Lets a user who passed step 1 (correct main password) but forgot their
  // 2FA cloud password regain access by verifying an OTP sent to their phone.
  async requestTwoFactorRecovery(pendingToken: string) {
    let payload;
    try {
      payload = verifyTwoFactorPendingToken(pendingToken);
    } catch {
      throw Errors.unauthorized();
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { phone: true, twoFactorHash: true } });
    if (!user || !user.twoFactorHash) throw Errors.unauthorized();

    await assertOtpCooldown(user.phone);

    const code = generateOtpCode();
    const codeHash = await hashOtpCode(code);

    await prisma.otpCode.create({
      data: { phone: user.phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });

    await sendOtpSms(user.phone, code);
  },

  async recoverTwoFactor({ pendingToken, code }: VerifyTwoFactorRecoveryInput, userAgent?: string | null) {
    let payload;
    try {
      payload = verifyTwoFactorPendingToken(pendingToken);
    } catch {
      throw Errors.unauthorized();
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.twoFactorHash) throw Errors.unauthorized();

    const otp = await prisma.otpCode.findFirst({
      where: { phone: user.phone },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw Errors.badRequest("Tasdiqlash kodi muddati o'tgan, qaytadan so'rang");
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw Errors.badRequest("Urinishlar soni tugadi, qaytadan so'rang");
    }

    const valid = await verifyOtpCode(code, otp.codeHash);
    if (!valid) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw Errors.badRequest("Tasdiqlash kodi noto'g'ri");
    }

    await prisma.user.update({ where: { id: user.id }, data: { twoFactorHash: null, twoFactorHint: null, lastSeenAt: new Date() } });
    await prisma.otpCode.delete({ where: { id: otp.id } });

    const tokens = await issueTokens(user, userAgent);
    notifyNewLogin(user.id, userAgent);
    return { user: toPublicUser(user), ...tokens };
  },

  // Lets a logged-out user who forgot their password regain access via a
  // phone OTP. Silently no-ops for unregistered phones to avoid leaking
  // which numbers have accounts.
  async requestPasswordReset({ phone }: RequestPasswordResetInput) {
    const user = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (!user) return;

    await assertOtpCooldown(phone);

    const code = generateOtpCode();
    const codeHash = await hashOtpCode(code);

    await prisma.otpCode.create({
      data: { phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });

    await sendOtpSms(phone, code);
  },

  async resetPassword({ phone, code, newPassword }: ResetPasswordInput) {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) throw Errors.badRequest("Tasdiqlash kodi noto'g'ri");

    const otp = await prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw Errors.badRequest("Tasdiqlash kodi muddati o'tgan, qaytadan so'rang");
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw Errors.badRequest("Urinishlar soni tugadi, qaytadan so'rang");
    }

    const valid = await verifyOtpCode(code, otp.codeHash);
    if (!valid) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw Errors.badRequest("Tasdiqlash kodi noto'g'ri");
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.otpCode.delete({ where: { id: otp.id } });
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await pushService.sendToUsers([user.id], {
      title: "Parol tiklandi",
      body: "Hisobingiz paroli telefon raqamingiz orqali tiklandi. Agar bu siz bo'lmasangiz, darhol hisobingizni tekshiring",
      data: { type: "security" },
    });
  },
};
