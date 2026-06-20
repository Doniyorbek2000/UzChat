-- CreateEnum
CREATE TYPE "RedPacketStatus" AS ENUM ('ACTIVE', 'CLAIMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "RedPacket" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "message" TEXT,
    "status" "RedPacketStatus" NOT NULL DEFAULT 'ACTIVE',
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedPacket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RedPacket_senderId_idx" ON "RedPacket"("senderId");

-- CreateIndex
CREATE INDEX "RedPacket_claimedById_idx" ON "RedPacket"("claimedById");

-- CreateIndex
CREATE INDEX "RedPacket_status_expiresAt_idx" ON "RedPacket"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "RedPacket" ADD CONSTRAINT "RedPacket_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedPacket" ADD CONSTRAINT "RedPacket_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
