-- CreateTable
CREATE TABLE "MessageEditHistory" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageEditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageEditHistory_messageId_idx" ON "MessageEditHistory"("messageId");

-- AddForeignKey
ALTER TABLE "MessageEditHistory" ADD CONSTRAINT "MessageEditHistory_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
