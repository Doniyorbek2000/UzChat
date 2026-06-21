-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowedFileTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "autoDownloadMedia" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoDownloadOnMobile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoDownloadOnWifi" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "blockAllFiles" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blockExecutableFiles" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "blockMediaFromStrangers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blockedFileTypes" TEXT[] DEFAULT ARRAY['apk', 'aab', 'exe', 'msi', 'bat', 'cmd', 'ps1', 'sh', 'dll', 'scr', 'com', 'vbs', 'wsf', 'jar', 'deb', 'rpm', 'dmg', 'pkg', 'app', 'ipa', 'xapk']::TEXT[],
ADD COLUMN     "maxFileSize" INTEGER NOT NULL DEFAULT 52428800;
