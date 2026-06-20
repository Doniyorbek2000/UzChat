-- CreateTable
CREATE TABLE "DeviceKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceKey_userId_idx" ON "DeviceKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceKey_userId_deviceId_key" ON "DeviceKey"("userId", "deviceId");

-- AddForeignKey
ALTER TABLE "DeviceKey" ADD CONSTRAINT "DeviceKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
