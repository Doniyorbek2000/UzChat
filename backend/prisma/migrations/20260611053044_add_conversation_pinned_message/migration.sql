-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "pinnedMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_pinnedMessageId_key" ON "Conversation"("pinnedMessageId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_pinnedMessageId_fkey" FOREIGN KEY ("pinnedMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
