-- AlterTable
ALTER TABLE "User" ADD COLUMN     "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quietHoursEnd" INTEGER,
ADD COLUMN     "quietHoursStart" INTEGER,
ADD COLUMN     "quietHoursTimezoneOffset" INTEGER;
