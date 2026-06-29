-- AlterTable: add large-group support and encryption fields
ALTER TABLE "Conversation" ADD COLUMN "isSupergroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "maxMembers" INTEGER NOT NULL DEFAULT 200000,
ADD COLUMN "memberCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "useSenderKeys" BOOLEAN NOT NULL DEFAULT false;

-- Backfill memberCount from existing participants
UPDATE "Conversation" SET "memberCount" = (
  SELECT COUNT(*) FROM "ConversationParticipant" WHERE "ConversationParticipant"."conversationId" = "Conversation"."id"
);

-- CreateTable: Signal Protocol one-time pre-keys
CREATE TABLE "PreKey" (
    "id" TEXT NOT NULL,
    "deviceKeyId" TEXT NOT NULL,
    "keyId" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PreKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Signal Protocol signed pre-key
CREATE TABLE "SignedPreKey" (
    "id" TEXT NOT NULL,
    "deviceKeyId" TEXT NOT NULL,
    "keyId" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignedPreKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SenderKey distribution for large groups
CREATE TABLE "SenderKeyStore" (
    "id" TEXT NOT NULL,
    "deviceKeyId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "senderKeyData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SenderKeyStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Double Ratchet session state
CREATE TABLE "E2eeSession" (
    "id" TEXT NOT NULL,
    "ownerDeviceKeyId" TEXT NOT NULL,
    "peerUserId" TEXT NOT NULL,
    "peerDeviceId" TEXT NOT NULL,
    "sessionData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "E2eeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable: offline message queue
CREATE TABLE "MessageQueue" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "senderDeviceId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable: key transparency log
CREATE TABLE "KeyTransparencyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "serverSig" TEXT NOT NULL,
    "previousLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KeyTransparencyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreKey_deviceKeyId_idx" ON "PreKey"("deviceKeyId");
CREATE UNIQUE INDEX "PreKey_deviceKeyId_keyId_key" ON "PreKey"("deviceKeyId", "keyId");
CREATE UNIQUE INDEX "SignedPreKey_deviceKeyId_key" ON "SignedPreKey"("deviceKeyId");
CREATE INDEX "SenderKeyStore_conversationId_idx" ON "SenderKeyStore"("conversationId");
CREATE UNIQUE INDEX "SenderKeyStore_deviceKeyId_conversationId_key" ON "SenderKeyStore"("deviceKeyId", "conversationId");
CREATE INDEX "E2eeSession_ownerDeviceKeyId_idx" ON "E2eeSession"("ownerDeviceKeyId");
CREATE UNIQUE INDEX "E2eeSession_ownerDeviceKeyId_peerUserId_peerDeviceId_key" ON "E2eeSession"("ownerDeviceKeyId", "peerUserId", "peerDeviceId");
CREATE INDEX "MessageQueue_recipientId_createdAt_idx" ON "MessageQueue"("recipientId", "createdAt");
CREATE INDEX "MessageQueue_conversationId_idx" ON "MessageQueue"("conversationId");
CREATE INDEX "KeyTransparencyLog_userId_createdAt_idx" ON "KeyTransparencyLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PreKey" ADD CONSTRAINT "PreKey_deviceKeyId_fkey" FOREIGN KEY ("deviceKeyId") REFERENCES "DeviceKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SignedPreKey" ADD CONSTRAINT "SignedPreKey_deviceKeyId_fkey" FOREIGN KEY ("deviceKeyId") REFERENCES "DeviceKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SenderKeyStore" ADD CONSTRAINT "SenderKeyStore_deviceKeyId_fkey" FOREIGN KEY ("deviceKeyId") REFERENCES "DeviceKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
