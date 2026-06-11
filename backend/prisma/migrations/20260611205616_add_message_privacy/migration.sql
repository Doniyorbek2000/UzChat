-- CreateEnum
CREATE TYPE "MessagePrivacy" AS ENUM ('EVERYONE', 'CONTACTS', 'NOBODY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "messagePrivacy" "MessagePrivacy" NOT NULL DEFAULT 'EVERYONE';
