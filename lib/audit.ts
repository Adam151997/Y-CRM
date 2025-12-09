import prisma from "./db";
import { Prisma } from "@prisma/client";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VOICE_COMMAND"
  | "AI_EXECUTION"
  | "AI_EXECUTION_COMPLETE"
  | "AI_EXECUTION_FAILED"
  | "LOGIN"
  | "LOGOUT"
  | "IMPORT"
  | "EXPORT";

export type AuditModule =
  | "LEAD"
  | "CONTACT"
  | "ACCOUNT"
  | "OPPORTUNITY"
  | "TASK"
  | "NOTE"
  | "ACTIVITY"
  | "DOCUMENT"
  | "CUSTOM_MODULE"
  | "CUSTOM_MODULE_RECORD"
  | "CUSTOM_FIELD"
  // Customer Success
  | "TICKET"
  | "TICKET_MESSAGE"
  | "ACCOUNT_HEALTH"
  | "PLAYBOOK"
  | "PLAYBOOK_RUN"
  | "RENEWAL"
  // Marketing
  | "CAMPAIGN"
  | "SEGMENT"
  | "FORM"
  | "FORM_SUBMISSION"
  // System
  | "SYSTEM"
  | "AUTH";

export type ActorType = "USER" | "AI_AGENT" | "SYSTEM" | "API";

export interface CreateAuditLogParams {
  orgId: string;
  action: AuditAction;
  module: AuditModule;
  recordId?: string;
  actorType: ActorType;
  actorId?: string | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  requestId?: string;
  parentLogId?: string;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  const {
    orgId,
    action,
    module,
    recordId,
    actorType,
    actorId,
    previousState,
    newState,
    metadata,
    requestId,
    parentLogId,
  } = params;

  try {
    const log = await prisma.auditLog.create({
      data: {
        orgId,
        action,
        module,
        recordId,
        actorType,
        actorId,
        previousState: previousState 
          ? (previousState as Prisma.InputJsonValue) 
          : undefined,
        newState: newState 
          ? (newState as Prisma.InputJsonValue) 
          : undefined,
        metadata: metadata 
          ? (metadata as Prisma.InputJsonValue) 
          : undefined,
        requestId,
        parentLogId,
      },
    });

    return log;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging shouldn't break the main operation
    return null;
  }
}

export async function getAuditLogs(params: {
  orgId: string;
  module?: AuditModule;
  recordId?: string;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const {
    orgId,
    module,
    recordId,
    actorId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = params;

  const where: Record<string, unknown> = { orgId };

  if (module) where.module = module;
  if (recordId) where.recordId = recordId;
  if (actorId) where.actorId = actorId;
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

export async function getAuditLogsByRequestId(requestId: string) {
  return prisma.auditLog.findMany({
    where: { requestId },
    orderBy: { createdAt: "asc" },
  });
}

// Helper to create audit context for a request
export function createAuditContext(params: {
  orgId: string;
  actorId?: string;
  actorType: ActorType;
}) {
  const requestId = crypto.randomUUID();
  
  return {
    requestId,
    log: (
      action: AuditAction,
      module: AuditModule,
      details: Partial<Omit<CreateAuditLogParams, "orgId" | "action" | "module" | "actorType" | "actorId" | "requestId">>
    ) =>
      createAuditLog({
        orgId: params.orgId,
        actorId: params.actorId,
        actorType: params.actorType,
        action,
        module,
        requestId,
        ...details,
      }),
  };
}
