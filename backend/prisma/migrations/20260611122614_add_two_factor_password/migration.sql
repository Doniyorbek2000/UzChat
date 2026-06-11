-- AlterTable
ALTER TABLE "User" ADD COLUMN     "twoFactorHash" TEXT,
ADD COLUMN     "twoFactorHint" TEXT;
