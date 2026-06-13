-- CreateEnum
CREATE TYPE "LastSeenExceptionMode" AS ENUM ('ALLOW', 'DENY');

-- CreateTable
CREATE TABLE "LastSeenException" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "exceptionUserId" TEXT NOT NULL,
    "mode" "LastSeenExceptionMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LastSeenException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LastSeenException_exceptionUserId_idx" ON "LastSeenException"("exceptionUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LastSeenException_ownerId_exceptionUserId_key" ON "LastSeenException"("ownerId", "exceptionUserId");

-- AddForeignKey
ALTER TABLE "LastSeenException" ADD CONSTRAINT "LastSeenException_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LastSeenException" ADD CONSTRAINT "LastSeenException_exceptionUserId_fkey" FOREIGN KEY ("exceptionUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
