-- CreateEnum
CREATE TYPE "NotificationPreview" AS ENUM ('DEFAULT', 'SHOW', 'HIDE');

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "notificationPreview" "NotificationPreview" NOT NULL DEFAULT 'DEFAULT';
