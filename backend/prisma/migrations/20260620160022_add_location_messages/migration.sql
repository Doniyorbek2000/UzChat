-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'LOCATION';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
