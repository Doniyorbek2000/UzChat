-- CreateEnum
CREATE TYPE "GroupAddPrivacy" AS ENUM ('EVERYONE', 'CONTACTS', 'NOBODY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "groupAddPrivacy" "GroupAddPrivacy" NOT NULL DEFAULT 'EVERYONE';
