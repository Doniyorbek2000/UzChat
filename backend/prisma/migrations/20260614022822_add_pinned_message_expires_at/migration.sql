-- AlterTable
ALTER TABLE "PinnedMessage" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PinnedMessage_expiresAt_idx" ON "PinnedMessage"("expiresAt");
