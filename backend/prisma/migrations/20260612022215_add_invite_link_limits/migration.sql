-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "inviteCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "inviteCodeMaxUses" INTEGER,
ADD COLUMN     "inviteCodeUseCount" INTEGER NOT NULL DEFAULT 0;
