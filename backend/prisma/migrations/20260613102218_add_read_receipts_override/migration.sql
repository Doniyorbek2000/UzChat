-- CreateEnum
CREATE TYPE "ReadReceiptsOverride" AS ENUM ('DEFAULT', 'ON', 'OFF');

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "readReceiptsOverride" "ReadReceiptsOverride" NOT NULL DEFAULT 'DEFAULT';
