-- CreateTable
CREATE TABLE "OnlineNotifyRequest" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnlineNotifyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnlineNotifyRequest_targetId_idx" ON "OnlineNotifyRequest"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineNotifyRequest_ownerId_targetId_key" ON "OnlineNotifyRequest"("ownerId", "targetId");

-- AddForeignKey
ALTER TABLE "OnlineNotifyRequest" ADD CONSTRAINT "OnlineNotifyRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineNotifyRequest" ADD CONSTRAINT "OnlineNotifyRequest_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
