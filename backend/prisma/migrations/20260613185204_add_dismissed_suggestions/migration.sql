-- CreateTable
CREATE TABLE "DismissedSuggestion" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "dismissedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DismissedSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DismissedSuggestion_ownerId_idx" ON "DismissedSuggestion"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "DismissedSuggestion_ownerId_dismissedUserId_key" ON "DismissedSuggestion"("ownerId", "dismissedUserId");

-- AddForeignKey
ALTER TABLE "DismissedSuggestion" ADD CONSTRAINT "DismissedSuggestion_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
