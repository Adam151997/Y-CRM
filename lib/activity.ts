import prisma from "@/lib/db";

/**
 * Activity types for timeline
 */
export type ActivityType =
  | "CALL"
  | "EMAIL"
  | "MEETING"
  | "VOICE_COMMAND"
  | "NOTE"
  | "TASK_COMPLETED"
  | "TICKET_CREATED"
  | "TICKET_RESOLVED"
  | "HEALTH_ALERT"
  | "PLAYBOOK_STARTED"
  | "PLAYBOOK_COMPLETED"
  | "RENEWAL_UPDATED"
  | "LEAD_CREATED"
  | "LEAD_CONVERTED"
  | "OPPORTUNITY_CREATED"
  | "OPPORTUNITY_WON"
  | "OPPORTUNITY_LOST"
  | "CONTACT_CREATED"
  | "ACCOUNT_CREATED";

interface CreateActivityParams {
  orgId: string;
  type: ActivityType;
  subject: string;
  description?: string | null;
  transcript?: string | null;
  duration?: number | null;
  workspace?: "sales" | "cs" | "marketing";
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  performedById: string;
  performedByType: "USER" | "AI_AGENT";
}

/**
 * Create an activity record for the timeline
 */
export async function createActivity(params: CreateActivityParams) {
  const {
    orgId,
    type,
    subject,
    description = null,
    transcript = null,
    duration = null,
    workspace = "sales",
    leadId = null,
    contactId = null,
    accountId = null,
    performedById,
    performedByType,
  } = params;

  try {
    const activity = await prisma.activity.create({
      data: {
        orgId,
        type,
        subject,
        description,
        transcript,
        duration,
        workspace,
        leadId,
        contactId,
        accountId,
        performedById,
        performedByType,
        performedAt: new Date(),
      },
    });

    return activity;
  } catch (error) {
    console.error("Failed to create activity:", error);
    // Don't throw - activity creation should not block main operations
    return null;
  }
}

/**
 * Helper to create activity when a note is added
 */
export async function createNoteActivity(params: {
  orgId: string;
  noteContent: string;
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  performedById: string;
  performedByType: "USER" | "AI_AGENT";
}) {
  const preview = params.noteContent.length > 100 
    ? params.noteContent.substring(0, 100) + "..." 
    : params.noteContent;

  return createActivity({
    orgId: params.orgId,
    type: "NOTE",
    subject: "Note added",
    description: preview,
    leadId: params.leadId,
    contactId: params.contactId,
    accountId: params.accountId,
    performedById: params.performedById,
    performedByType: params.performedByType,
  });
}

/**
 * Helper to create activity when a task is completed
 */
export async function createTaskCompletedActivity(params: {
  orgId: string;
  taskTitle: string;
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  performedById: string;
  performedByType: "USER" | "AI_AGENT";
}) {
  return createActivity({
    orgId: params.orgId,
    type: "TASK_COMPLETED",
    subject: `Task completed: ${params.taskTitle}`,
    leadId: params.leadId,
    contactId: params.contactId,
    accountId: params.accountId,
    performedById: params.performedById,
    performedByType: params.performedByType,
  });
}

/**
 * Helper to create activity for calls, emails, meetings
 */
export async function createCommunicationActivity(params: {
  orgId: string;
  type: "CALL" | "EMAIL" | "MEETING";
  subject: string;
  description?: string;
  duration?: number;
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  performedById: string;
  performedByType: "USER" | "AI_AGENT";
}) {
  return createActivity({
    orgId: params.orgId,
    type: params.type,
    subject: params.subject,
    description: params.description,
    duration: params.duration,
    leadId: params.leadId,
    contactId: params.contactId,
    accountId: params.accountId,
    performedById: params.performedById,
    performedByType: params.performedByType,
  });
}

/**
 * Helper to create activity for record creation
 */
export async function createRecordCreatedActivity(params: {
  orgId: string;
  recordType: "LEAD" | "CONTACT" | "ACCOUNT" | "OPPORTUNITY";
  recordName: string;
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  performedById: string;
  performedByType: "USER" | "AI_AGENT";
}) {
  const typeMap = {
    LEAD: "LEAD_CREATED",
    CONTACT: "CONTACT_CREATED",
    ACCOUNT: "ACCOUNT_CREATED",
    OPPORTUNITY: "OPPORTUNITY_CREATED",
  } as const;

  return createActivity({
    orgId: params.orgId,
    type: typeMap[params.recordType] as ActivityType,
    subject: `${params.recordType.charAt(0) + params.recordType.slice(1).toLowerCase()} created: ${params.recordName}`,
    leadId: params.leadId,
    contactId: params.contactId,
    accountId: params.accountId,
    performedById: params.performedById,
    performedByType: params.performedByType,
  });
}
