-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "membersCanAddMembers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "membersCanPinMessages" BOOLEAN NOT NULL DEFAULT false;
