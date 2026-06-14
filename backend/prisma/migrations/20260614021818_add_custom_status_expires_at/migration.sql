-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customStatusExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_customStatusExpiresAt_idx" ON "User"("customStatusExpiresAt");
