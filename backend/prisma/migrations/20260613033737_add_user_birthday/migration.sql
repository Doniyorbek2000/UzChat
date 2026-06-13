-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthdayDay" INTEGER,
ADD COLUMN     "birthdayMonth" INTEGER,
ADD COLUMN     "birthdayPrivacy" "LastSeenPrivacy" NOT NULL DEFAULT 'CONTACTS';
