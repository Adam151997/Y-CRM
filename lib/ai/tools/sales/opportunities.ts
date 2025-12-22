/**
 * Opportunity Tools for Sales Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { revalidateOpportunityCaches } from "@/lib/cache-utils";
import { resolveUser } from "@/lib/user-resolver";
import { logToolExecution, handleToolError } from "../helpers";

export function createOpportunityTools(orgId: string, userId: string) {
  return {
    createOpportunity: createOpportunityTool(orgId, userId),
    searchOpportunities: searchOpportunitiesTool(orgId),
  };
}

const createOpportunityTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new sales opportunity. Requires an existing account. Can optionally assign to a team member.",
    parameters: z.object({
      name: z.string().describe("Opportunity name (required)"),
      value: z.number().describe("Deal value in dollars (required, must be positive)"),
      accountId: z.string().describe("Associated account ID (UUID, required)"),
      stageId: z.string().optional().describe("Pipeline stage ID (UUID)"),
      expectedCloseDate: z.string().optional().describe("Expected close date (ISO format)"),
      probability: z.number().optional().describe("Win probability % (0-100)"),
      assignTo: z.string().optional().describe("Assign to team member by name, email, or 'me'"),
    }),
    execute: async (params) => {
      logToolExecution("createOpportunity", params);
      try {
        // Check for duplicate opportunity created in last 60 seconds
        const recentDuplicate = await prisma.opportunity.findFirst({
          where: {
            orgId,
            name: { equals: params.name, mode: "insensitive" },
            accountId: params.accountId,
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createOpportunity] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            opportunityId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Opportunity "${recentDuplicate.name}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        const account = await prisma.account.findFirst({
          where: { id: params.accountId, orgId },
        });
        if (!account) {
          return { success: false, message: "Account not found. Please create an account first." };
        }

        let stageId = params.stageId;
        if (!stageId) {
          const defaultStage = await prisma.pipelineStage.findFirst({
            where: { orgId, module: "OPPORTUNITY", isWon: false, isLost: false },
            orderBy: { order: "asc" },
          });
          if (!defaultStage) {
            return { success: false, message: "No pipeline stages configured" };
          }
          stageId = defaultStage.id;
        }

        // Resolve assignee if provided
        let assignedToId: string | undefined;
        let assignedToName: string | undefined;
        if (params.assignTo) {
          const resolved = await resolveUser(orgId, params.assignTo, userId);
          if (resolved) {
            assignedToId = resolved.id;
            assignedToName = resolved.name;
          }
        }

        const opportunity = await prisma.opportunity.create({
          data: {
            orgId,
            name: params.name,
            value: params.value,
            accountId: params.accountId,
            stageId,
            expectedCloseDate: params.expectedCloseDate ? new Date(params.expectedCloseDate) : null,
            probability: params.probability || 50,
            assignedToId,
          },
          include: {
            account: { select: { name: true } },
            stage: { select: { name: true } },
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "OPPORTUNITY",
          recordId: opportunity.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: opportunity as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateOpportunityCaches();

        const assignmentMsg = assignedToName ? ` Assigned to ${assignedToName}.` : "";
        return {
          success: true,
          opportunityId: opportunity.id,
          assignedToId,
          assignedToName,
          message: `Created opportunity "${opportunity.name}" worth ${params.value.toLocaleString()} with ${opportunity.account.name} (ID: ${opportunity.id}).${assignmentMsg}`,
        };
      } catch (error) {
        return handleToolError(error, "createOpportunity");
      }
    },
  });

const searchOpportunitiesTool = (orgId: string) =>
  tool({
    description: "Search for sales opportunities",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      accountId: z.string().optional().describe("Filter by account ID (UUID)"),
      minValue: z.number().optional().describe("Minimum deal value"),
      maxValue: z.number().optional().describe("Maximum deal value"),
      limit: z.number().optional().describe("Maximum results (1-20, default 5)"),
    }),
    execute: async ({ query, accountId, minValue, maxValue, limit = 5 }) => {
      logToolExecution("searchOpportunities", { query, accountId, minValue, maxValue, limit });
      try {
        const where: Record<string, unknown> = { orgId, closedWon: null };
        if (accountId) where.accountId = accountId;
        if (query) {
          where.name = { contains: query, mode: "insensitive" };
        }
        if (minValue || maxValue) {
          where.value = {};
          if (minValue) (where.value as Record<string, number>).gte = minValue;
          if (maxValue) (where.value as Record<string, number>).lte = maxValue;
        }

        const opportunities = await prisma.opportunity.findMany({
          where,
          take: limit,
          orderBy: { value: "desc" },
          include: {
            account: { select: { name: true } },
            stage: { select: { name: true } },
          },
        });

        return {
          success: true,
          count: opportunities.length,
          totalValue: opportunities.reduce((sum, o) => sum + Number(o.value), 0),
          opportunities: opportunities.map((o) => ({
            id: o.id,
            name: o.name,
            value: Number(o.value),
            account: o.account.name,
            stage: o.stage.name,
            probability: o.probability,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchOpportunities"), count: 0, totalValue: 0, opportunities: [] };
      }
    },
  });
