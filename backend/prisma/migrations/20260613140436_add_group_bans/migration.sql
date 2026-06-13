-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GroupAuditAction" ADD VALUE 'MEMBER_BANNED';
ALTER TYPE "GroupAuditAction" ADD VALUE 'MEMBER_UNBANNED';

-- CreateTable
CREATE TABLE "GroupBan" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "bannedUserId" TEXT NOT NULL,
    "bannedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupBan_conversationId_idx" ON "GroupBan"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupBan_conversationId_bannedUserId_key" ON "GroupBan"("conversationId", "bannedUserId");

-- AddForeignKey
ALTER TABLE "GroupBan" ADD CONSTRAINT "GroupBan_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
