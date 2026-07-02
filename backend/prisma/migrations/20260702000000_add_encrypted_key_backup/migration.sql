-- CreateTable: password-encrypted E2EE keypair backup (server sees ciphertext only)
CREATE TABLE "EncryptedKeyBackup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncryptedKeyBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EncryptedKeyBackup_userId_key" ON "EncryptedKeyBackup"("userId");

-- AddForeignKey
ALTER TABLE "EncryptedKeyBackup" ADD CONSTRAINT "EncryptedKeyBackup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
