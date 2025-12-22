/**
 * Health Score Tools for Customer Success Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { logToolExecution, handleToolError } from "../helpers";

export function createHealthTools(orgId: string) {
  return {
    getHealthScore: getHealthScoreTool(orgId),
    searchAtRiskAccounts: searchAtRiskAccountsTool(orgId),
  };
}

const getHealthScoreTool = (orgId: string) =>
  tool({
    description: "Get the health score for an account",
    parameters: z.object({
      accountId: z.string().describe("Account ID (UUID)"),
    }),
    execute: async ({ accountId }) => {
      logToolExecution("getHealthScore", { accountId });
      try {
        const health = await prisma.accountHealth.findUnique({
          where: { accountId },
          include: {
            account: { select: { name: true } },
          },
        });

        if (!health) {
          return {
            success: true,
            message: "No health score recorded for this account",
            health: null,
          };
        }

        return {
          success: true,
          health: {
            accountName: health.account.name,
            score: health.score,
            riskLevel: health.riskLevel,
            isAtRisk: health.isAtRisk,
            components: {
              engagement: health.engagementScore,
              support: health.supportScore,
              relationship: health.relationshipScore,
              financial: health.financialScore,
              adoption: health.adoptionScore,
            },
            riskReasons: health.riskReasons,
            lastCalculated: health.calculatedAt.toISOString(),
          },
        };
      } catch (error) {
        return handleToolError(error, "getHealthScore");
      }
    },
  });

const searchAtRiskAccountsTool = (orgId: string) =>
  tool({
    description: "Find accounts that are at risk based on health scores",
    parameters: z.object({
      riskLevel: z.string().optional().describe("Filter by risk level: HIGH or CRITICAL"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ riskLevel, limit = 10 }) => {
      logToolExecution("searchAtRiskAccounts", { riskLevel, limit });
      try {
        const where: Record<string, unknown> = { orgId, isAtRisk: true };
        if (riskLevel) {
          where.riskLevel = riskLevel;
        } else {
          where.riskLevel = { in: ["HIGH", "CRITICAL"] };
        }

        const healthScores = await prisma.accountHealth.findMany({
          where,
          take: limit,
          orderBy: { score: "asc" },
          include: {
            account: { select: { id: true, name: true } },
          },
        });

        return {
          success: true,
          count: healthScores.length,
          accounts: healthScores.map((h) => ({
            accountId: h.account.id,
            accountName: h.account.name,
            score: h.score,
            riskLevel: h.riskLevel,
            riskReasons: h.riskReasons,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchAtRiskAccounts"), count: 0, accounts: [] };
      }
    },
  });
