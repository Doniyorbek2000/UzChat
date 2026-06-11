-- CreateEnum
CREATE TYPE "LastSeenPrivacy" AS ENUM ('EVERYONE', 'CONTACTS', 'NOBODY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenPrivacy" "LastSeenPrivacy" NOT NULL DEFAULT 'EVERYONE';
