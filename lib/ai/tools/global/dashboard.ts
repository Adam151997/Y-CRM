/**
 * Dashboard/Stats Tools for All Workspaces
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { logToolExecution, handleToolError } from "../helpers";

// Simple in-memory cache for dashboard stats (60 second TTL)
const statsCache = new Map<string, { data: Record<string, unknown>; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getCachedStats(key: string): Record<string, unknown> | null {
  const cached = statsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Dashboard] Cache hit for ${key}`);
    return cached.data;
  }
  return null;
}

function setCachedStats(key: string, data: Record<string, unknown>): void {
  statsCache.set(key, { data, timestamp: Date.now() });
}

export function createDashboardTools(orgId: string) {
  return {
    getDashboardStats: getDashboardStatsTool(orgId),
  };
}

const getDashboardStatsTool = (orgId: string) =>
  tool({
    description: "Get CRM dashboard statistics including leads, contacts, accounts, tickets, and pipeline value",
    parameters: z.object({
      workspace: z.string().optional().describe("Get stats for specific workspace: sales, cs, marketing, or all (default)"),
      bypassCache: z.boolean().optional().describe("Force fresh data (default: false, uses 60s cache)"),
    }),
    execute: async ({ workspace = "all", bypassCache = false }) => {
      logToolExecution("getDashboardStats", { workspace, bypassCache });
      try {
        // Check cache first
        const cacheKey = `${orgId}:${workspace}`;
        if (!bypassCache) {
          const cached = getCachedStats(cacheKey);
          if (cached) {
            return { success: true, stats: cached, cached: true };
          }
        }

        const stats: Record<string, unknown> = {};

        if (workspace === "all" || workspace === "sales") {
          const [totalLeads, totalContacts, totalAccounts, openOpportunities] =
            await prisma.$transaction([
              prisma.lead.count({ where: { orgId } }),
              prisma.contact.count({ where: { orgId } }),
              prisma.account.count({ where: { orgId } }),
              prisma.opportunity.aggregate({
                where: { orgId, closedWon: null },
                _count: true,
                _sum: { value: true },
              }),
            ]);

          stats.sales = {
            leads: totalLeads,
            contacts: totalContacts,
            accounts: totalAccounts,
            openOpportunities: openOpportunities._count,
            pipelineValue: Number(openOpportunities._sum.value || 0),
          };
        }

        if (workspace === "all" || workspace === "cs") {
          const [openTickets, atRiskAccounts] = await prisma.$transaction([
            prisma.ticket.count({ where: { orgId, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
            prisma.accountHealth.count({ where: { orgId, isAtRisk: true } }),
          ]);

          stats.cs = {
            openTickets,
            atRiskAccounts,
          };
        }

        if (workspace === "all" || workspace === "marketing") {
          const [activeCampaigns, activeSegments, activeForms] = await prisma.$transaction([
            prisma.campaign.count({ where: { orgId, status: "ACTIVE" } }),
            prisma.segment.count({ where: { orgId, isActive: true } }),
            prisma.form.count({ where: { orgId, isActive: true } }),
          ]);

          stats.marketing = {
            activeCampaigns,
            activeSegments,
            activeForms,
          };
        }

        const pendingTasks = await prisma.task.count({
          where: { orgId, status: { in: ["PENDING", "IN_PROGRESS"] } },
        });

        stats.tasks = { pending: pendingTasks };

        // Cache the result
        setCachedStats(cacheKey, stats);

        return { success: true, stats, cached: false };
      } catch (error) {
        return { ...handleToolError(error, "getDashboardStats"), stats: null };
      }
    },
  });
