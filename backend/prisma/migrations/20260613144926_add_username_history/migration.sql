-- AlterTable
ALTER TABLE "User" ADD COLUMN     "usernameChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UsernameHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldUsername" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsernameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsernameHistory_userId_idx" ON "UsernameHistory"("userId");

-- CreateIndex
CREATE INDEX "UsernameHistory_oldUsername_idx" ON "UsernameHistory"("oldUsername");

-- AddForeignKey
ALTER TABLE "UsernameHistory" ADD CONSTRAINT "UsernameHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
