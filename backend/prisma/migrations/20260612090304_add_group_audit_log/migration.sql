-- CreateEnum
CREATE TYPE "GroupAuditAction" AS ENUM ('MEMBER_REMOVED', 'ROLE_CHANGED', 'MEMBER_RESTRICTED', 'MEMBER_UNRESTRICTED', 'MESSAGE_DELETED');

-- CreateTable
CREATE TABLE "GroupAuditLogEntry" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" "GroupAuditAction" NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupAuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupAuditLogEntry_conversationId_createdAt_idx" ON "GroupAuditLogEntry"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "GroupAuditLogEntry" ADD CONSTRAINT "GroupAuditLogEntry_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
