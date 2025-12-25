/**
 * Lookup/List Tools
 * Tools for fetching available options like pipeline stages, segments, team members, etc.
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";
import { logToolExecution, handleToolError } from "../helpers";

export function createLookupTools(orgId: string) {
  return {
    listPipelineStages: listPipelineStagesTool(orgId),
    listCustomModules: listCustomModulesTool(orgId),
    listSegments: listSegmentsTool(orgId),
    listTeamMembers: listTeamMembersTool(orgId),
    listDepartments: listDepartmentsTool(orgId),
    getSystemOptions: getSystemOptionsTool(),
  };
}

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

Returns module names, slugs, and field counts.`,
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
                fieldName: true,
                fieldKey: true,
                fieldType: true,
                required: true,
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
            slug: m.slug,
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

const listTeamMembersTool = (orgId: string) =>
  tool({
    description: `List all team members in the organization.

Examples:
- "Who's on my team?" → lists all members
- "List sales team members" → role filter can be applied
- "Find team member John" → search by name

Returns member names, emails, roles, and IDs for task assignment.`,
    parameters: z.object({
      role: z.enum(["org:admin", "org:member"]).optional()
        .describe("Filter by role: 'org:admin' for admins only, 'org:member' for regular members"),
      search: z.string().optional().describe("Search by name or email"),
    }),
    execute: async ({ role, search }) => {
      logToolExecution("listTeamMembers", { role, search });
      try {
        const client = await clerkClient();
        const memberships = await client.organizations.getOrganizationMembershipList({
          organizationId: orgId,
          limit: 100,
        });

        let members = memberships.data.map((m) => ({
          id: m.publicUserData?.userId || "",
          name: `${m.publicUserData?.firstName || ""} ${m.publicUserData?.lastName || ""}`.trim() ||
            m.publicUserData?.identifier ||
            "Unknown",
          firstName: m.publicUserData?.firstName || "",
          lastName: m.publicUserData?.lastName || "",
          email: m.publicUserData?.identifier || null,
          imageUrl: m.publicUserData?.imageUrl || null,
          role: m.role,
        })).filter((m) => m.id);

        // Apply role filter
        if (role) {
          members = members.filter(m => m.role === role);
        }

        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          members = members.filter(m =>
            m.name.toLowerCase().includes(searchLower) ||
            (m.email && m.email.toLowerCase().includes(searchLower))
          );
        }

        return {
          success: true,
          count: members.length,
          members,
          message: `Found ${members.length} team member(s).`,
        };
      } catch (error) {
        return handleToolError(error, "listTeamMembers");
      }
    },
  });

const listDepartmentsTool = (orgId: string) =>
  tool({
    description: `List available departments/teams in the organization.

Returns department names and member counts. Useful for routing and assignment.`,
    parameters: z.object({}),
    execute: async () => {
      logToolExecution("listDepartments", {});
      try {
        // Check if organization has custom departments configured
        // For now, return default workspaces as "departments"
        // In future, this could be expanded with a Department model

        // Get assignment counts from actual data
        const [leadAssignments, ticketAssignments, opportunityAssignments] = await Promise.all([
          prisma.lead.groupBy({
            by: ["assignedToId"],
            where: { orgId, assignedToId: { not: null } },
            _count: true,
          }),
          prisma.ticket.groupBy({
            by: ["assignedToId"],
            where: { orgId, assignedToId: { not: null } },
            _count: true,
          }),
          prisma.opportunity.groupBy({
            by: ["assignedToId"],
            where: { orgId, assignedToId: { not: null } },
            _count: true,
          }),
        ]);

        // Default department structure based on workspaces
        const departments = [
          {
            id: "sales",
            name: "Sales",
            description: "Sales team handling leads and opportunities",
            workspace: "sales",
            metrics: {
              activeLeads: leadAssignments.reduce((sum, a) => sum + a._count, 0),
              activeOpportunities: opportunityAssignments.reduce((sum, a) => sum + a._count, 0),
            },
          },
          {
            id: "customer-success",
            name: "Customer Success",
            description: "CS team handling accounts and renewals",
            workspace: "cs",
            metrics: {
              activeTickets: ticketAssignments.reduce((sum, a) => sum + a._count, 0),
            },
          },
          {
            id: "marketing",
            name: "Marketing",
            description: "Marketing team handling campaigns and segments",
            workspace: "marketing",
          },
        ];

        return {
          success: true,
          count: departments.length,
          departments,
          note: "Departments are based on CRM workspaces. Custom departments can be configured in settings.",
        };
      } catch (error) {
        return handleToolError(error, "listDepartments");
      }
    },
  });
