-- CreateTable
CREATE TABLE "MiniApp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "iconUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "creatorId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiniApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MiniApp_creatorId_idx" ON "MiniApp"("creatorId");

-- CreateIndex
CREATE INDEX "MiniApp_category_idx" ON "MiniApp"("category");

-- AddForeignKey
ALTER TABLE "MiniApp" ADD CONSTRAINT "MiniApp_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
