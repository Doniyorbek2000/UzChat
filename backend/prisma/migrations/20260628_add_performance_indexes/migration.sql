-- CreateIndex
CREATE INDEX "Contact_targetId_status_idx" ON "Contact"("targetId", "status");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_isArchived_idx" ON "ConversationParticipant"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_isMuted_idx" ON "ConversationParticipant"("userId", "isMuted");

-- CreateIndex
CREATE INDEX "Message_conversationId_type_idx" ON "Message"("conversationId", "type");

-- CreateIndex
CREATE INDEX "OtpCode_expiresAt_idx" ON "OtpCode"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
