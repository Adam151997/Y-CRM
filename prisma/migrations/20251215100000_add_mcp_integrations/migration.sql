-- CreateTable
CREATE TABLE "MCPIntegration" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "transportType" TEXT NOT NULL DEFAULT 'SSE',
    "serverUrl" TEXT,
    "command" TEXT,
    "args" JSONB,
    "env" JSONB,
    "authType" TEXT,
    "authConfig" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "lastConnectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "capabilities" JSONB,
    "toolCount" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoConnect" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MCPIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MCPIntegration_orgId_idx" ON "MCPIntegration"("orgId");

-- CreateIndex
CREATE INDEX "MCPIntegration_orgId_isEnabled_idx" ON "MCPIntegration"("orgId", "isEnabled");

-- CreateIndex
CREATE INDEX "MCPIntegration_orgId_status_idx" ON "MCPIntegration"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MCPIntegration_orgId_name_key" ON "MCPIntegration"("orgId", "name");
