-- CreateIndex
CREATE INDEX "BlockedUser_ownerId_idx" ON "BlockedUser"("ownerId");

-- CreateIndex
CREATE INDEX "Contact_ownerId_status_idx" ON "Contact"("ownerId", "status");

