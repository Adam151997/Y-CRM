/**
 * Activity Timeline Tools
 * Tools for retrieving activity history and entity timelines
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { logToolExecution, handleToolError } from "../helpers";

export function createActivityTools(orgId: string) {
  return {
    getRecentActivity: getRecentActivityTool(orgId),
    getEntityTimeline: getEntityTimelineTool(orgId),
  };
}

const getRecentActivityTool = (orgId: string) =>
  tool({
    description: `Get recent activity across the organization.

Examples:
- "Show me recent activity" → returns last 20 activities
- "What happened today?" → activityTypes: all, limit: 50
- "Show me all calls this week" → activityTypes: ["CALL"]`,
    parameters: z.object({
      limit: z.number().min(1).max(100).default(20).describe("Number of activities to return (default: 20, max: 100)"),
      activityTypes: z.array(z.enum([
        "CALL", "EMAIL", "MEETING", "VOICE_COMMAND", "NOTE", "TASK_COMPLETED",
        "TICKET_CREATED", "TICKET_RESOLVED", "HEALTH_ALERT",
        "PLAYBOOK_STARTED", "PLAYBOOK_COMPLETED", "RENEWAL_UPDATED"
      ])).optional().describe("Filter by activity types"),
      workspace: z.enum(["sales", "cs", "marketing"]).optional().describe("Filter by workspace"),
      daysBack: z.number().min(1).max(90).default(7).describe("Number of days to look back (default: 7)"),
    }),
    execute: async ({ limit = 20, activityTypes, workspace, daysBack = 7 }) => {
      logToolExecution("getRecentActivity", { limit, activityTypes, workspace, daysBack });
      try {
        const since = new Date();
        since.setDate(since.getDate() - daysBack);

        const activities = await prisma.activity.findMany({
          where: {
            orgId,
            ...(activityTypes && activityTypes.length > 0 ? { type: { in: activityTypes } } : {}),
            ...(workspace ? { workspace } : {}),
            performedAt: { gte: since },
          },
          include: {
            lead: { select: { id: true, firstName: true, lastName: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            account: { select: { id: true, name: true } },
          },
          orderBy: { performedAt: "desc" },
          take: limit,
        });

        const formatted = activities.map(a => ({
          id: a.id,
          type: a.type,
          subject: a.subject,
          description: a.description,
          workspace: a.workspace,
          duration: a.duration,
          performedAt: a.performedAt.toISOString(),
          performedBy: a.performedByType === "AI_AGENT" ? "AI Assistant" : "User",
          relatedTo: a.lead
            ? { type: "lead", id: a.lead.id, name: `${a.lead.firstName} ${a.lead.lastName}` }
            : a.contact
            ? { type: "contact", id: a.contact.id, name: `${a.contact.firstName} ${a.contact.lastName}` }
            : a.account
            ? { type: "account", id: a.account.id, name: a.account.name }
            : null,
        }));

        // Group by date for summary
        const byDate: Record<string, number> = {};
        activities.forEach(a => {
          const date = a.performedAt.toISOString().split("T")[0];
          byDate[date] = (byDate[date] || 0) + 1;
        });

        return {
          success: true,
          count: activities.length,
          activities: formatted,
          summary: {
            byDate,
            totalInPeriod: activities.length,
            daysBack,
          },
          message: `Found ${activities.length} activities in the last ${daysBack} days.`,
        };
      } catch (error) {
        return handleToolError(error, "getRecentActivity");
      }
    },
  });

const getEntityTimelineTool = (orgId: string) =>
  tool({
    description: `Get the complete activity timeline for a specific lead, contact, or account.

Examples:
- "Show me the timeline for lead John Smith" → entityType: "lead", entityId: "uuid"
- "What's the history on Acme Corp?" → entityType: "account", entityId: "uuid"`,
    parameters: z.object({
      entityType: z.enum(["lead", "contact", "account"]).describe("Type of entity"),
      entityId: z.string().uuid().describe("Entity ID"),
      limit: z.number().min(1).max(100).default(50).describe("Number of activities to return (default: 50)"),
    }),
    execute: async ({ entityType, entityId, limit = 50 }) => {
      logToolExecution("getEntityTimeline", { entityType, entityId, limit });
      try {
        // Build where clause based on entity type
        const whereClause: Record<string, unknown> = { orgId };
        if (entityType === "lead") whereClause.leadId = entityId;
        if (entityType === "contact") whereClause.contactId = entityId;
        if (entityType === "account") whereClause.accountId = entityId;

        // Verify entity exists
        let entityName = "";
        if (entityType === "lead") {
          const lead = await prisma.lead.findFirst({ where: { id: entityId, orgId } });
          if (!lead) return { success: false, message: "Lead not found", errorCode: "NOT_FOUND" as const };
          entityName = `${lead.firstName} ${lead.lastName}`;
        } else if (entityType === "contact") {
          const contact = await prisma.contact.findFirst({ where: { id: entityId, orgId } });
          if (!contact) return { success: false, message: "Contact not found", errorCode: "NOT_FOUND" as const };
          entityName = `${contact.firstName} ${contact.lastName}`;
        } else {
          const account = await prisma.account.findFirst({ where: { id: entityId, orgId } });
          if (!account) return { success: false, message: "Account not found", errorCode: "NOT_FOUND" as const };
          entityName = account.name;
        }

        const activities = await prisma.activity.findMany({
          where: whereClause,
          orderBy: { performedAt: "desc" },
          take: limit,
        });

        // Also get related notes and tasks for a complete timeline
        const [notes, tasks] = await Promise.all([
          entityType === "lead"
            ? prisma.note.findMany({ where: { leadId: entityId }, orderBy: { createdAt: "desc" }, take: 10 })
            : entityType === "contact"
            ? prisma.note.findMany({ where: { contactId: entityId }, orderBy: { createdAt: "desc" }, take: 10 })
            : prisma.note.findMany({ where: { accountId: entityId }, orderBy: { createdAt: "desc" }, take: 10 }),
          entityType === "lead"
            ? prisma.task.findMany({ where: { leadId: entityId }, orderBy: { createdAt: "desc" }, take: 10 })
            : entityType === "contact"
            ? prisma.task.findMany({ where: { contactId: entityId }, orderBy: { createdAt: "desc" }, take: 10 })
            : prisma.task.findMany({ where: { accountId: entityId }, orderBy: { createdAt: "desc" }, take: 10 }),
        ]);

        // Combine and format timeline
        const timeline = [
          ...activities.map(a => ({
            id: a.id,
            type: a.type,
            category: "activity" as const,
            subject: a.subject,
            description: a.description,
            timestamp: a.performedAt.toISOString(),
            performedBy: a.performedByType === "AI_AGENT" ? "AI Assistant" : "User",
          })),
          ...notes.map(n => ({
            id: n.id,
            type: "NOTE",
            category: "note" as const,
            subject: "Note added",
            description: n.content.substring(0, 200) + (n.content.length > 200 ? "..." : ""),
            timestamp: n.createdAt.toISOString(),
            performedBy: "User",
          })),
          ...tasks.map(t => ({
            id: t.id,
            type: t.status === "COMPLETED" ? "TASK_COMPLETED" : "TASK_CREATED",
            category: "task" as const,
            subject: t.title,
            description: t.description?.substring(0, 200) || null,
            timestamp: (t.completedAt || t.createdAt).toISOString(),
            performedBy: "User",
          })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Activity type breakdown
        const typeBreakdown: Record<string, number> = {};
        activities.forEach(a => {
          typeBreakdown[a.type] = (typeBreakdown[a.type] || 0) + 1;
        });

        return {
          success: true,
          entityType,
          entityId,
          entityName,
          timelineCount: timeline.length,
          timeline: timeline.slice(0, limit),
          summary: {
            totalActivities: activities.length,
            totalNotes: notes.length,
            totalTasks: tasks.length,
            activityBreakdown: typeBreakdown,
          },
          message: `Found ${timeline.length} timeline entries for ${entityName}.`,
        };
      } catch (error) {
        return handleToolError(error, "getEntityTimeline");
      }
    },
  });
