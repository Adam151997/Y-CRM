/*
  Warnings:

  - A unique constraint covering the columns `[orgId,customModuleId,fieldKey]` on the table `CustomFieldDefinition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orgId,userId,workspace]` on the table `DashboardConfig` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DashboardConfig_orgId_userId_key";

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "workspace" TEXT NOT NULL DEFAULT 'sales';

-- AlterTable
ALTER TABLE "CustomFieldDefinition" ADD COLUMN     "customModuleId" TEXT,
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "relatedModule" TEXT,
ALTER COLUMN "module" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DashboardConfig" ADD COLUMN     "workspace" TEXT NOT NULL DEFAULT 'sales';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "workspace" TEXT NOT NULL DEFAULT 'sales';

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "actions" TEXT[],
    "fields" JSONB,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ticketNumber" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "accountId" TEXT NOT NULL,
    "contactId" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL DEFAULT 'USER',
    "sentiment" TEXT,
    "tags" JSONB,
    "aiSummary" TEXT,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolution" TEXT,
    "satisfactionScore" INTEGER,
    "satisfactionFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHtml" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorName" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountHealth" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 50,
    "previousScore" INTEGER,
    "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "engagementScore" INTEGER NOT NULL DEFAULT 50,
    "supportScore" INTEGER NOT NULL DEFAULT 50,
    "relationshipScore" INTEGER NOT NULL DEFAULT 50,
    "financialScore" INTEGER NOT NULL DEFAULT 50,
    "adoptionScore" INTEGER NOT NULL DEFAULT 50,
    "lastLoginAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "lastMeetingAt" TIMESTAMP(3),
    "openTicketCount" INTEGER NOT NULL DEFAULT 0,
    "avgTicketResolution" INTEGER,
    "isAtRisk" BOOLEAN NOT NULL DEFAULT false,
    "riskReasons" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "triggerConfig" JSONB,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "startedById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybookRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Renewal" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "contractName" TEXT,
    "contractValue" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "renewalValue" DECIMAL(15,2),
    "probability" INTEGER NOT NULL DEFAULT 50,
    "outcome" TEXT,
    "churnReason" TEXT,
    "expansionAmount" DECIMAL(15,2),
    "ownerUserId" TEXT,
    "notes" TEXT,
    "lastContactAt" TIMESTAMP(3),
    "nextActionDate" TIMESTAMP(3),
    "nextAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Renewal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomModule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pluralName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'box',
    "color" TEXT,
    "labelField" TEXT NOT NULL DEFAULT 'name',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showInSidebar" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomModuleRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomModuleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "segmentId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "subject" TEXT,
    "content" JSONB,
    "settings" JSONB,
    "metrics" JSONB,
    "budget" DECIMAL(15,2),
    "spent" DECIMAL(15,2),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "ruleLogic" TEXT NOT NULL DEFAULT 'AND',
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3),
    "type" TEXT NOT NULL DEFAULT 'DYNAMIC',
    "staticMembers" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB,
    "createLead" BOOLEAN NOT NULL DEFAULT true,
    "assignToUserId" TEXT,
    "leadSource" TEXT NOT NULL DEFAULT 'FORM',
    "views" INTEGER NOT NULL DEFAULT 0,
    "submissions" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "slug" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "leadId" TEXT,
    "contactId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Role_orgId_idx" ON "Role"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_orgId_name_key" ON "Role"("orgId", "name");

-- CreateIndex
CREATE INDEX "Permission_roleId_idx" ON "Permission"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_roleId_module_key" ON "Permission"("roleId", "module");

-- CreateIndex
CREATE INDEX "UserRole_orgId_idx" ON "UserRole"("orgId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_clerkUserId_orgId_key" ON "UserRole"("clerkUserId", "orgId");

-- CreateIndex
CREATE INDEX "Ticket_orgId_status_idx" ON "Ticket"("orgId", "status");

-- CreateIndex
CREATE INDEX "Ticket_orgId_priority_idx" ON "Ticket"("orgId", "priority");

-- CreateIndex
CREATE INDEX "Ticket_orgId_accountId_idx" ON "Ticket"("orgId", "accountId");

-- CreateIndex
CREATE INDEX "Ticket_orgId_assignedToId_idx" ON "Ticket"("orgId", "assignedToId");

-- CreateIndex
CREATE INDEX "Ticket_orgId_createdAt_idx" ON "Ticket"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountHealth_accountId_key" ON "AccountHealth"("accountId");

-- CreateIndex
CREATE INDEX "AccountHealth_orgId_riskLevel_idx" ON "AccountHealth"("orgId", "riskLevel");

-- CreateIndex
CREATE INDEX "AccountHealth_orgId_score_idx" ON "AccountHealth"("orgId", "score");

-- CreateIndex
CREATE INDEX "AccountHealth_orgId_isAtRisk_idx" ON "AccountHealth"("orgId", "isAtRisk");

-- CreateIndex
CREATE INDEX "Playbook_orgId_idx" ON "Playbook"("orgId");

-- CreateIndex
CREATE INDEX "Playbook_orgId_isActive_idx" ON "Playbook"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "Playbook_orgId_trigger_idx" ON "Playbook"("orgId", "trigger");

-- CreateIndex
CREATE INDEX "PlaybookRun_orgId_status_idx" ON "PlaybookRun"("orgId", "status");

-- CreateIndex
CREATE INDEX "PlaybookRun_orgId_accountId_idx" ON "PlaybookRun"("orgId", "accountId");

-- CreateIndex
CREATE INDEX "PlaybookRun_playbookId_idx" ON "PlaybookRun"("playbookId");

-- CreateIndex
CREATE INDEX "Renewal_orgId_status_idx" ON "Renewal"("orgId", "status");

-- CreateIndex
CREATE INDEX "Renewal_orgId_endDate_idx" ON "Renewal"("orgId", "endDate");

-- CreateIndex
CREATE INDEX "Renewal_orgId_ownerUserId_idx" ON "Renewal"("orgId", "ownerUserId");

-- CreateIndex
CREATE INDEX "Renewal_accountId_idx" ON "Renewal"("accountId");

-- CreateIndex
CREATE INDEX "CustomModule_orgId_idx" ON "CustomModule"("orgId");

-- CreateIndex
CREATE INDEX "CustomModule_orgId_isActive_idx" ON "CustomModule"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CustomModule_orgId_slug_key" ON "CustomModule"("orgId", "slug");

-- CreateIndex
CREATE INDEX "CustomModuleRecord_orgId_idx" ON "CustomModuleRecord"("orgId");

-- CreateIndex
CREATE INDEX "CustomModuleRecord_moduleId_idx" ON "CustomModuleRecord"("moduleId");

-- CreateIndex
CREATE INDEX "CustomModuleRecord_moduleId_createdAt_idx" ON "CustomModuleRecord"("moduleId", "createdAt");

-- CreateIndex
CREATE INDEX "Campaign_orgId_status_idx" ON "Campaign"("orgId", "status");

-- CreateIndex
CREATE INDEX "Campaign_orgId_type_idx" ON "Campaign"("orgId", "type");

-- CreateIndex
CREATE INDEX "Campaign_segmentId_idx" ON "Campaign"("segmentId");

-- CreateIndex
CREATE INDEX "Segment_orgId_idx" ON "Segment"("orgId");

-- CreateIndex
CREATE INDEX "Segment_orgId_isActive_idx" ON "Segment"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "Form_orgId_idx" ON "Form"("orgId");

-- CreateIndex
CREATE INDEX "Form_orgId_isActive_idx" ON "Form"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Form_orgId_slug_key" ON "Form"("orgId", "slug");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_idx" ON "FormSubmission"("formId");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_createdAt_idx" ON "FormSubmission"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_orgId_userId_isRead_idx" ON "Notification"("orgId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_orgId_userId_createdAt_idx" ON "Notification"("orgId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Activity_orgId_workspace_idx" ON "Activity"("orgId", "workspace");

-- CreateIndex
CREATE INDEX "Activity_accountId_idx" ON "Activity"("accountId");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_orgId_customModuleId_idx" ON "CustomFieldDefinition"("orgId", "customModuleId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_orgId_customModuleId_fieldKey_key" ON "CustomFieldDefinition"("orgId", "customModuleId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardConfig_orgId_userId_workspace_key" ON "DashboardConfig"("orgId", "userId", "workspace");

-- CreateIndex
CREATE INDEX "Task_orgId_workspace_idx" ON "Task"("orgId", "workspace");

-- CreateIndex
CREATE INDEX "Task_accountId_idx" ON "Task"("accountId");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountHealth" ADD CONSTRAINT "AccountHealth_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookRun" ADD CONSTRAINT "PlaybookRun_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Renewal" ADD CONSTRAINT "Renewal_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Renewal" ADD CONSTRAINT "Renewal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomModule" ADD CONSTRAINT "CustomModule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomModuleRecord" ADD CONSTRAINT "CustomModuleRecord_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CustomModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_customModuleId_fkey" FOREIGN KEY ("customModuleId") REFERENCES "CustomModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
