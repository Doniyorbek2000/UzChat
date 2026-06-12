-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyGroupChats" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyPrivateChats" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyReactions" BOOLEAN NOT NULL DEFAULT true;
