-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_pinnedAt_pinnedOrder_idx" ON "ConversationParticipant"("userId", "pinnedAt", "pinnedOrder");

-- CreateIndex
CREATE INDEX "Message_expiresAt_deletedAt_idx" ON "Message"("expiresAt", "deletedAt");

-- CreateIndex
CREATE INDEX "Message_scheduledFor_sendWhenOnline_idx" ON "Message"("scheduledFor", "sendWhenOnline");

-- CreateIndex
CREATE INDEX "MessageReminder_userId_remindAt_idx" ON "MessageReminder"("userId", "remindAt");
