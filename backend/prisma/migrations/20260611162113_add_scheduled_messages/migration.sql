-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "scheduledFor" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_scheduledFor_idx" ON "Message"("scheduledFor");
