/**
 * Lead Tools for Sales Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { revalidateLeadCaches } from "@/lib/cache-utils";
import { resolveUser } from "@/lib/user-resolver";
import { logToolExecution, handleToolError } from "../helpers";

export function createLeadTools(orgId: string, userId: string) {
  return {
    createLead: createLeadTool(orgId, userId),
    searchLeads: searchLeadsTool(orgId),
    updateLead: updateLeadTool(orgId, userId),
  };
}

const createLeadTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new lead in the CRM. Use this when the user wants to add a new lead or prospect. Can optionally assign to a team member.",
    parameters: z.object({
      firstName: z.string().describe("Lead's first name (required)"),
      lastName: z.string().describe("Lead's last name (required)"),
      email: z.string().optional().describe("Lead's email address"),
      phone: z.string().optional().describe("Lead's phone number"),
      company: z.string().optional().describe("Company name"),
      title: z.string().optional().describe("Job title"),
      source: z.string().optional().describe("Lead source: REFERRAL, WEBSITE, COLD_CALL, LINKEDIN, TRADE_SHOW, ADVERTISEMENT, EMAIL_CAMPAIGN, or OTHER"),
      assignTo: z.string().optional().describe("Assign to team member by name, email, or 'me' (e.g., 'Mike', 'sarah@company.com', 'me')"),
    }),
    execute: async (params) => {
      logToolExecution("createLead", params);
      try {
        // Check for duplicate lead created in last 60 seconds
        const recentDuplicate = await prisma.lead.findFirst({
          where: {
            orgId,
            firstName: { equals: params.firstName, mode: "insensitive" },
            lastName: { equals: params.lastName, mode: "insensitive" },
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createLead] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            leadId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Lead "${recentDuplicate.firstName} ${recentDuplicate.lastName}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        // Resolve assignee if provided
        let assignedToId: string | undefined;
        let assignedToName: string | undefined;
        if (params.assignTo) {
          const resolved = await resolveUser(orgId, params.assignTo, userId);
          if (resolved) {
            assignedToId = resolved.id;
            assignedToName = resolved.name;
            console.log("[Tool:createLead] Resolved assignee:", assignedToName);
          }
        }

        const { assignTo, ...leadData } = params;
        const lead = await prisma.lead.create({
          data: {
            orgId,
            ...leadData,
            status: "NEW",
            assignedToId,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "LEAD",
          recordId: lead.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: lead as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateLeadCaches();

        const assignmentMsg = assignedToName ? ` Assigned to ${assignedToName}.` : "";
        return {
          success: true,
          leadId: lead.id,
          assignedToId,
          assignedToName,
          message: `Created lead "${lead.firstName} ${lead.lastName}"${lead.company ? ` at ${lead.company}` : ""} (ID: ${lead.id}).${assignmentMsg}`,
        };
      } catch (error) {
        return handleToolError(error, "createLead");
      }
    },
  });

const searchLeadsTool = (orgId: string) =>
  tool({
    description: "Search for leads in the CRM. Use this to find existing leads by name, email, company, or status.",
    parameters: z.object({
      query: z.string().optional().describe("Search term to match against name, email, or company"),
      status: z.string().optional().describe("Filter by lead status: NEW, CONTACTED, QUALIFIED, CONVERTED, or LOST"),
      limit: z.number().optional().describe("Maximum number of results to return (1-20, default 5)"),
    }),
    execute: async ({ query, status, limit = 5 }) => {
      logToolExecution("searchLeads", { query, status, limit });
      try {
        const where: Record<string, unknown> = { orgId };

        if (status) where.status = status;
        if (query) {
          where.OR = [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { company: { contains: query, mode: "insensitive" } },
          ];
        }

        const leads = await prisma.lead.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            status: true,
            createdAt: true,
          },
        });

        return {
          success: true,
          count: leads.length,
          leads: leads.map((l) => ({
            id: l.id,
            name: `${l.firstName} ${l.lastName}`,
            email: l.email,
            company: l.company,
            status: l.status,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchLeads"), count: 0, leads: [] };
      }
    },
  });

const updateLeadTool = (orgId: string, userId: string) =>
  tool({
    description: "Update an existing lead's information",
    parameters: z.object({
      leadId: z.string().describe("The lead ID (UUID) to update"),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      title: z.string().optional(),
      status: z.string().optional().describe("Lead status: NEW, CONTACTED, QUALIFIED, CONVERTED, or LOST"),
    }),
    execute: async ({ leadId, ...updates }) => {
      logToolExecution("updateLead", { leadId, ...updates });
      try {
        const existing = await prisma.lead.findFirst({
          where: { id: leadId, orgId },
        });

        if (!existing) {
          return { success: false, message: "Lead not found" };
        }

        const lead = await prisma.lead.update({
          where: { id: leadId },
          data: updates,
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "LEAD",
          recordId: lead.id,
          actorType: "AI_AGENT",
          actorId: userId,
          previousState: existing as unknown as Record<string, unknown>,
          newState: lead as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateLeadCaches();

        return {
          success: true,
          message: `Updated lead: ${lead.firstName} ${lead.lastName}`,
        };
      } catch (error) {
        return handleToolError(error, "updateLead");
      }
    },
  });
