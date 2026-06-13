-- AlterTable
ALTER TABLE "ChatFolder" ADD COLUMN     "excludeMuted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "includeDirect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "includeGroups" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "includeUnread" BOOLEAN NOT NULL DEFAULT false;
