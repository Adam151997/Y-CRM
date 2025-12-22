/**
 * Renewal Tools for Customer Success Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { logToolExecution, handleToolError } from "../helpers";

export function createRenewalTools(orgId: string, userId: string) {
  return {
    createRenewal: createRenewalTool(orgId, userId),
    searchRenewals: searchRenewalsTool(orgId),
    updateRenewal: updateRenewalTool(orgId, userId),
    getUpcomingRenewals: getUpcomingRenewalsTool(orgId),
  };
}

const createRenewalTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new renewal/contract tracking record for an account",
    parameters: z.object({
      accountId: z.string().uuid().describe("Account ID (required)"),
      contractName: z.string().optional().describe("Contract name"),
      contractValue: z.number().positive().describe("Contract value (required)"),
      currency: z.string().default("USD"),
      startDate: z.string().describe("Contract start date (ISO format)"),
      endDate: z.string().describe("Contract end date (ISO format)"),
      status: z.enum(["UPCOMING", "IN_PROGRESS", "RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"]).default("UPCOMING"),
      probability: z.number().min(0).max(100).default(50),
      notes: z.string().optional(),
    }),
    execute: async (params) => {
      logToolExecution("createRenewal", params);
      try {
        // Check for duplicate renewal created in last 60 seconds
        const recentDuplicate = await prisma.renewal.findFirst({
          where: {
            orgId,
            accountId: params.accountId,
            contractName: params.contractName ? { equals: params.contractName, mode: "insensitive" } : undefined,
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createRenewal] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            renewalId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Renewal already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        const account = await prisma.account.findFirst({
          where: { id: params.accountId, orgId },
        });
        if (!account) {
          return { success: false, message: "Account not found" };
        }

        const renewal = await prisma.renewal.create({
          data: {
            orgId,
            accountId: params.accountId,
            contractName: params.contractName,
            contractValue: params.contractValue,
            currency: params.currency,
            startDate: new Date(params.startDate),
            endDate: new Date(params.endDate),
            status: params.status,
            probability: params.probability,
            notes: params.notes,
            ownerUserId: userId,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "RENEWAL",
          recordId: renewal.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: renewal as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        return {
          success: true,
          renewalId: renewal.id,
          message: `Created renewal for ${account.name} worth ${params.contractValue.toLocaleString()} ending ${new Date(params.endDate).toLocaleDateString()} (ID: ${renewal.id})`,
        };
      } catch (error) {
        return handleToolError(error, "createRenewal");
      }
    },
  });

const searchRenewalsTool = (orgId: string) =>
  tool({
    description: "Search for contract renewals",
    parameters: z.object({
      accountId: z.string().uuid().optional().describe("Filter by account"),
      status: z.enum(["UPCOMING", "IN_PROGRESS", "RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"]).optional(),
      upcomingDays: z.number().optional().describe("Find renewals ending within X days"),
      limit: z.number().min(1).max(20).default(10),
    }),
    execute: async ({ accountId, status, upcomingDays, limit }) => {
      logToolExecution("searchRenewals", { accountId, status, upcomingDays, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (accountId) where.accountId = accountId;
        if (status) where.status = status;

        if (upcomingDays) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + upcomingDays);
          where.endDate = {
            gte: new Date(),
            lte: futureDate,
          };
          where.status = { in: ["UPCOMING", "IN_PROGRESS"] };
        }

        const renewals = await prisma.renewal.findMany({
          where,
          take: limit,
          orderBy: { endDate: "asc" },
          include: {
            account: { select: { id: true, name: true } },
          },
        });

        return {
          success: true,
          count: renewals.length,
          renewals: renewals.map((r) => ({
            id: r.id,
            accountName: r.account.name,
            contractName: r.contractName,
            contractValue: Number(r.contractValue),
            currency: r.currency,
            endDate: r.endDate.toISOString(),
            status: r.status,
            probability: r.probability,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchRenewals"), count: 0, renewals: [] };
      }
    },
  });

const updateRenewalTool = (orgId: string, userId: string) =>
  tool({
    description: "Update a renewal's status, probability, or other details",
    parameters: z.object({
      renewalId: z.string().uuid().describe("Renewal ID to update"),
      status: z.enum(["UPCOMING", "IN_PROGRESS", "RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"]).optional(),
      probability: z.number().min(0).max(100).optional(),
      renewalValue: z.number().positive().optional().describe("New contract value if renewed"),
      churnReason: z.string().optional().describe("Reason for churn (if churned)"),
      notes: z.string().optional(),
    }),
    execute: async ({ renewalId, ...updates }) => {
      logToolExecution("updateRenewal", { renewalId, ...updates });
      try {
        const existing = await prisma.renewal.findFirst({
          where: { id: renewalId, orgId },
          include: { account: { select: { name: true } } },
        });
        if (!existing) {
          return { success: false, message: "Renewal not found" };
        }

        const updateData: Record<string, unknown> = {};
        if (updates.status) updateData.status = updates.status;
        if (updates.probability !== undefined) updateData.probability = updates.probability;
        if (updates.renewalValue) updateData.renewalValue = updates.renewalValue;
        if (updates.churnReason) updateData.churnReason = updates.churnReason;
        if (updates.notes) updateData.notes = updates.notes;

        // Set outcome based on status
        if (updates.status === "RENEWED") updateData.outcome = "RENEWED";
        if (updates.status === "CHURNED") updateData.outcome = "CHURNED";
        if (updates.status === "DOWNGRADED") updateData.outcome = "DOWNGRADED";
        if (updates.status === "EXPANDED") updateData.outcome = "EXPANDED";

        const renewal = await prisma.renewal.update({
          where: { id: renewalId },
          data: updateData,
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "RENEWAL",
          recordId: renewal.id,
          actorType: "AI_AGENT",
          actorId: userId,
          previousState: existing as unknown as Record<string, unknown>,
          newState: renewal as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        return {
          success: true,
          message: `Updated renewal for ${existing.account.name}${updates.status ? ` - Status: ${updates.status}` : ""}`,
        };
      } catch (error) {
        return handleToolError(error, "updateRenewal");
      }
    },
  });

const getUpcomingRenewalsTool = (orgId: string) =>
  tool({
    description: "Get renewals that are coming up soon (next 30, 60, or 90 days)",
    parameters: z.object({
      days: z.number().min(1).max(365).default(90).describe("Days to look ahead"),
    }),
    execute: async ({ days }) => {
      logToolExecution("getUpcomingRenewals", { days });
      try {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const renewals = await prisma.renewal.findMany({
          where: {
            orgId,
            endDate: {
              gte: new Date(),
              lte: futureDate,
            },
            status: { in: ["UPCOMING", "IN_PROGRESS"] },
          },
          orderBy: { endDate: "asc" },
          include: {
            account: { select: { id: true, name: true } },
          },
        });

        const totalValue = renewals.reduce((sum, r) => sum + Number(r.contractValue), 0);
        const atRisk = renewals.filter((r) => r.probability < 50);

        return {
          success: true,
          count: renewals.length,
          totalValue,
          atRiskCount: atRisk.length,
          renewals: renewals.map((r) => {
            const daysUntil = Math.ceil((r.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return {
              id: r.id,
              accountName: r.account.name,
              contractName: r.contractName,
              contractValue: Number(r.contractValue),
              daysUntilExpiry: daysUntil,
              probability: r.probability,
              status: r.status,
            };
          }),
        };
      } catch (error) {
        return { ...handleToolError(error, "getUpcomingRenewals"), count: 0, totalValue: 0, atRiskCount: 0, renewals: [] };
      }
    },
  });
