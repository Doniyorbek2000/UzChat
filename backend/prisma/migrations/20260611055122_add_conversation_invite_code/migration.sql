-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "inviteCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_inviteCode_key" ON "Conversation"("inviteCode");
