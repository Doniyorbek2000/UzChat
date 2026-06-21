-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "LoginAttempt_phone_createdAt_idx" ON "LoginAttempt"("phone", "createdAt");
CREATE INDEX "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");
CREATE INDEX "AdminAuditLog_adminId_createdAt_idx" ON "AdminAuditLog"("adminId", "createdAt");
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
CREATE INDEX "AdminAuditLog_targetId_idx" ON "AdminAuditLog"("targetId");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
