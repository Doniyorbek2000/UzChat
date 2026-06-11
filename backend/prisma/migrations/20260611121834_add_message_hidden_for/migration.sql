-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "hiddenFor" TEXT[] DEFAULT ARRAY[]::TEXT[];
