-- CreateTable
CREATE TABLE "BroadcastList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memberIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BroadcastList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BroadcastList_userId_idx" ON "BroadcastList"("userId");

-- AddForeignKey
ALTER TABLE "BroadcastList" ADD CONSTRAINT "BroadcastList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
