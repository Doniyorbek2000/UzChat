-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "mutedSenderIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
