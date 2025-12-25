/**
 * Lookup/List Tools
 * Tools for fetching available options like pipeline stages, team members, etc.
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { logToolExecution, handleToolError } from "../helpers";

export function createLookupTools(orgId: string) {
  return {
    listTeamMembers: listTeamMembersTool(orgId),
    listPipelineStages: listPipelineStagesTool(orgId),
    listCustomModules: listCustomModulesTool(orgId),
    listSegments: listSegmentsTool(orgId),
    getSystemOptions: getSystemOptionsTool(),
  };
}

const listTeamMembersTool = (orgId: string) =>
  tool({
    description: `List all team members in the organization. Useful for finding who to assign records to.

Example response includes user IDs, names, and emails for assignment.`,
    parameters: z.object({
      role: z.enum(["ADMIN", "MEMBER"]).optional().describe("Filter by role"),
      limit: z.number().min(1).max(100).default(50).describe("Maximum results (1-100)"),
    }),
    execute: async ({ role, limit }) => {
      logToolExecution("listTeamMembers", { role, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (role) where.role = role;

        const members = await prisma.membership.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        return {
          success: true,
          count: members.length,
          members: members.map(m => ({
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
          })),
        };
      } catch (error) {
        return handleToolError(error, "listTeamMembers");
      }
    },
  });

const listPipelineStagesTool = (orgId: string) =>
  tool({
    description: `List all opportunity pipeline stages. Use this to see available stages for opportunities.

Returns stage names, order, and probability for each stage.`,
    parameters: z.object({}),
    execute: async () => {
      logToolExecution("listPipelineStages", {});
      try {
        const stages = await prisma.pipelineStage.findMany({
          where: { orgId },
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            order: true,
            probability: true,
            color: true,
          },
        });

        // If no custom stages, return default stages
        if (stages.length === 0) {
          return {
            success: true,
            count: 6,
            stages: [
              { name: "PROSPECTING", probability: 10 },
              { name: "QUALIFICATION", probability: 20 },
              { name: "NEEDS_ANALYSIS", probability: 40 },
              { name: "PROPOSAL", probability: 60 },
              { name: "NEGOTIATION", probability: 80 },
              { name: "CLOSED_WON", probability: 100 },
              { name: "CLOSED_LOST", probability: 0 },
            ],
            isDefault: true,
          };
        }

        return {
          success: true,
          count: stages.length,
          stages,
          isDefault: false,
        };
      } catch (error) {
        return handleToolError(error, "listPipelineStages");
      }
    },
  });

const listCustomModulesTool = (orgId: string) =>
  tool({
    description: `List all custom modules configured for this organization.

Returns module names, API names, and field counts.`,
    parameters: z.object({
      includeFields: z.boolean().optional().describe("Include field definitions (default: false)"),
    }),
    execute: async ({ includeFields = false }) => {
      logToolExecution("listCustomModules", { includeFields });
      try {
        const modules = await prisma.customModule.findMany({
          where: { orgId },
          orderBy: { name: "asc" },
          include: {
            fields: includeFields ? {
              select: {
                id: true,
                name: true,
                apiName: true,
                fieldType: true,
                isRequired: true,
              },
            } : false,
            _count: {
              select: { fields: true, records: true },
            },
          },
        });

        return {
          success: true,
          count: modules.length,
          modules: modules.map(m => ({
            id: m.id,
            name: m.name,
            apiName: m.apiName,
            description: m.description,
            fieldCount: m._count.fields,
            recordCount: m._count.records,
            fields: includeFields ? m.fields : undefined,
          })),
        };
      } catch (error) {
        return handleToolError(error, "listCustomModules");
      }
    },
  });

const listSegmentsTool = (orgId: string) =>
  tool({
    description: `List all marketing segments. Useful for targeting campaigns.

Returns segment names, member counts, and active status.`,
    parameters: z.object({
      activeOnly: z.boolean().optional().describe("Only show active segments (default: true)"),
    }),
    execute: async ({ activeOnly = true }) => {
      logToolExecution("listSegments", { activeOnly });
      try {
        const where: Record<string, unknown> = { orgId };
        if (activeOnly) where.isActive = true;

        const segments = await prisma.segment.findMany({
          where,
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            memberCount: true,
          },
        });

        return {
          success: true,
          count: segments.length,
          segments,
        };
      } catch (error) {
        return handleToolError(error, "listSegments");
      }
    },
  });

const getSystemOptionsTool = () =>
  tool({
    description: `Get available options for various CRM fields.

Returns enums for: leadStatus, leadSource, accountType, accountRating,
ticketStatus, ticketPriority, ticketCategory, taskStatus, taskType,
campaignType, campaignStatus, renewalStatus.`,
    parameters: z.object({
      optionType: z.enum([
        "leadStatus", "leadSource", "accountType", "accountRating",
        "ticketStatus", "ticketPriority", "ticketCategory",
        "taskStatus", "taskType", "campaignType", "campaignStatus",
        "renewalStatus", "all"
      ]).describe("Type of options to retrieve, or 'all' for everything"),
    }),
    execute: async ({ optionType }) => {
      logToolExecution("getSystemOptions", { optionType });

      const options: Record<string, string[]> = {
        leadStatus: ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"],
        leadSource: ["REFERRAL", "WEBSITE", "COLD_CALL", "LINKEDIN", "TRADE_SHOW", "ADVERTISEMENT", "EMAIL_CAMPAIGN", "OTHER"],
        accountType: ["PROSPECT", "CUSTOMER", "PARTNER", "VENDOR"],
        accountRating: ["HOT", "WARM", "COLD"],
        ticketStatus: ["NEW", "OPEN", "PENDING", "RESOLVED", "CLOSED"],
        ticketPriority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        ticketCategory: ["BUG", "BILLING", "FEATURE_REQUEST", "QUESTION", "GENERAL"],
        taskStatus: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
        taskType: ["CALL", "EMAIL", "MEETING", "FOLLOW_UP", "ONBOARDING", "RENEWAL", "OTHER"],
        campaignType: ["EMAIL", "SOCIAL", "EVENT", "WEBINAR", "SMS", "ADS"],
        campaignStatus: ["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"],
        renewalStatus: ["UPCOMING", "IN_PROGRESS", "RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"],
      };

      if (optionType === "all") {
        return { success: true, options };
      }

      return {
        success: true,
        optionType,
        values: options[optionType] || [],
      };
    },
  });
