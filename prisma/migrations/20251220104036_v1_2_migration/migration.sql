-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "recordVisibility" TEXT NOT NULL DEFAULT 'ALL';

-- CreateTable
CREATE TABLE "APIKey" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "APIKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "APIKey_orgId_idx" ON "APIKey"("orgId");

-- CreateIndex
CREATE INDEX "APIKey_orgId_isActive_idx" ON "APIKey"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "APIKey_keyPrefix_idx" ON "APIKey"("keyPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "APIKey_keyHash_key" ON "APIKey"("keyHash");
