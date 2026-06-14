-- AlterTable
ALTER TABLE "User" ADD COLUMN     "selfDestructDays" INTEGER NOT NULL DEFAULT 180;

-- CreateIndex
CREATE INDEX "User_lastSeenAt_idx" ON "User"("lastSeenAt");
