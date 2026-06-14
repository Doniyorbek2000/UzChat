-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationsPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationsPausedUntil" TIMESTAMP(3);
