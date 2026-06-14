-- CreateTable
CREATE TABLE "MessageReminder" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageReminder_userId_idx" ON "MessageReminder"("userId");

-- CreateIndex
CREATE INDEX "MessageReminder_remindAt_idx" ON "MessageReminder"("remindAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReminder_messageId_userId_key" ON "MessageReminder"("messageId", "userId");

-- AddForeignKey
ALTER TABLE "MessageReminder" ADD CONSTRAINT "MessageReminder_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReminder" ADD CONSTRAINT "MessageReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
