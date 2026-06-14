-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "pollClosesAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_pollClosesAt_idx" ON "Message"("pollClosesAt");
