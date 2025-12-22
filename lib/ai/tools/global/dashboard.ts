/**
 * Dashboard/Stats Tools for All Workspaces
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { logToolExecution, handleToolError } from "../helpers";

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
    }),
    execute: async ({ workspace = "all" }) => {
      logToolExecution("getDashboardStats", { workspace });
      try {
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

        return { success: true, stats };
      } catch (error) {
        return { ...handleToolError(error, "getDashboardStats"), stats: null };
      }
    },
  });
