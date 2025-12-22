/**
 * Account Tools for Sales & CS Workspaces
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { revalidateAccountCaches } from "@/lib/cache-utils";
import { resolveUser } from "@/lib/user-resolver";
import { logToolExecution, handleToolError } from "../helpers";

export function createAccountTools(orgId: string, userId: string) {
  return {
    createAccount: createAccountTool(orgId, userId),
    searchAccounts: searchAccountsTool(orgId),
  };
}

const createAccountTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new account (company/organization) in the CRM. Can optionally assign to a team member.",
    parameters: z.object({
      name: z.string().describe("Company name (required)"),
      industry: z.string().optional().describe("Industry"),
      website: z.string().optional().describe("Website URL"),
      phone: z.string().optional().describe("Phone number"),
      type: z.string().optional().describe("Account type: PROSPECT, CUSTOMER, PARTNER, or VENDOR"),
      rating: z.string().optional().describe("Account rating: HOT, WARM, or COLD"),
      assignTo: z.string().optional().describe("Assign to team member by name, email, or 'me'"),
    }),
    execute: async (params) => {
      logToolExecution("createAccount", params);
      try {
        // Check for duplicate account created in last 60 seconds
        const recentDuplicate = await prisma.account.findFirst({
          where: {
            orgId,
            name: { equals: params.name, mode: "insensitive" },
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createAccount] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            accountId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Account "${recentDuplicate.name}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
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
          }
        }

        const { assignTo, ...accountData } = params;
        const account = await prisma.account.create({
          data: {
            orgId,
            name: accountData.name,
            industry: accountData.industry,
            website: accountData.website,
            phone: accountData.phone,
            type: accountData.type as "PROSPECT" | "CUSTOMER" | "PARTNER" | "VENDOR" | undefined,
            rating: accountData.rating as "HOT" | "WARM" | "COLD" | undefined,
            assignedToId,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "ACCOUNT",
          recordId: account.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: account as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateAccountCaches();

        const assignmentMsg = assignedToName ? ` Assigned to ${assignedToName}.` : "";
        return {
          success: true,
          accountId: account.id,
          assignedToId,
          assignedToName,
          message: `Created account "${account.name}" (ID: ${account.id}).${assignmentMsg}`,
        };
      } catch (error) {
        return handleToolError(error, "createAccount");
      }
    },
  });

const searchAccountsTool = (orgId: string) =>
  tool({
    description: "Search for accounts/companies",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      type: z.string().optional().describe("Filter by type: PROSPECT, CUSTOMER, PARTNER, or VENDOR"),
      limit: z.number().optional().describe("Maximum results (1-20, default 5)"),
    }),
    execute: async ({ query, type, limit = 5 }) => {
      logToolExecution("searchAccounts", { query, type, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (type) where.type = type;
        if (query) {
          where.OR = [
            { name: { contains: query, mode: "insensitive" } },
            { industry: { contains: query, mode: "insensitive" } },
          ];
        }

        const accounts = await prisma.account.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { contacts: true, opportunities: true } } },
        });

        return {
          success: true,
          count: accounts.length,
          accounts: accounts.map((a) => ({
            id: a.id,
            name: a.name,
            industry: a.industry,
            type: a.type,
            contactCount: a._count.contacts,
            opportunityCount: a._count.opportunities,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchAccounts"), count: 0, accounts: [] };
      }
    },
  });
