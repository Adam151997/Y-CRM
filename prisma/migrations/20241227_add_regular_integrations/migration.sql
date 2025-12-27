-- CreateTable
CREATE TABLE "RegularIntegration" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "events" TEXT[],
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "webhookToken" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegularIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT,
    "requestUrl" TEXT NOT NULL,
    "requestHeaders" JSONB,
    "requestBody" JSONB,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "nextRetryAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegularIntegration_webhookToken_key" ON "RegularIntegration"("webhookToken");

-- CreateIndex
CREATE UNIQUE INDEX "RegularIntegration_orgId_name_key" ON "RegularIntegration"("orgId", "name");

-- CreateIndex
CREATE INDEX "RegularIntegration_orgId_idx" ON "RegularIntegration"("orgId");

-- CreateIndex
CREATE INDEX "RegularIntegration_orgId_isEnabled_idx" ON "RegularIntegration"("orgId", "isEnabled");

-- CreateIndex
CREATE INDEX "RegularIntegration_orgId_type_idx" ON "RegularIntegration"("orgId", "type");

-- CreateIndex
CREATE INDEX "RegularIntegration_webhookToken_idx" ON "RegularIntegration"("webhookToken");

-- CreateIndex
CREATE INDEX "WebhookDelivery_integrationId_idx" ON "WebhookDelivery"("integrationId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_orgId_eventType_idx" ON "WebhookDelivery"("orgId", "eventType");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_nextRetryAt_idx" ON "WebhookDelivery"("status", "nextRetryAt");

-- AddForeignKey
ALTER TABLE "RegularIntegration" ADD CONSTRAINT "RegularIntegration_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
