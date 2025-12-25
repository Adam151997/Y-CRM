/**
 * Analytics and Suggestions Tools
 * Tools for intelligent suggestions and tool usage metrics
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { logToolExecution, handleToolError } from "../helpers";

// In-memory tool usage tracker
const toolUsageStats: Map<string, {
  calls: number;
  successes: number;
  failures: number;
  lastUsed: Date;
  avgDuration: number;
  totalDuration: number;
}> = new Map();

/**
 * Track tool execution (call this from other tools)
 */
export function trackToolUsage(toolName: string, success: boolean, durationMs: number) {
  const existing = toolUsageStats.get(toolName) || {
    calls: 0,
    successes: 0,
    failures: 0,
    lastUsed: new Date(),
    avgDuration: 0,
    totalDuration: 0,
  };

  existing.calls++;
  if (success) existing.successes++;
  else existing.failures++;
  existing.lastUsed = new Date();
  existing.totalDuration += durationMs;
  existing.avgDuration = existing.totalDuration / existing.calls;

  toolUsageStats.set(toolName, existing);
}

export function createAnalyticsTools(orgId: string) {
  return {
    getSuggestions: getSuggestionsTool(orgId),
    getToolUsageMetrics: getToolUsageMetricsTool(),
  };
}

const getSuggestionsTool = (orgId: string) =>
  tool({
    description: `Get intelligent suggestions based on current data and patterns.

Examples:
- "What should I focus on today?" → category: "priority"
- "Any at-risk accounts?" → category: "risk"
- "What follow-ups do I need?" → category: "followup"`,
    parameters: z.object({
      category: z.enum(["all", "priority", "risk", "followup", "opportunity"]).default("all")
        .describe("Suggestion category: 'priority' (urgent items), 'risk' (at-risk accounts/leads), 'followup' (needed follow-ups), 'opportunity' (sales opportunities)"),
    }),
    execute: async ({ category = "all" }) => {
      logToolExecution("getSuggestions", { category });
      try {
        const suggestions: Array<{
          type: string;
          priority: "high" | "medium" | "low";
          message: string;
          action: string;
          entityType?: string;
          entityId?: string;
          entityName?: string;
        }> = [];

        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Priority suggestions
        if (category === "all" || category === "priority") {
          // Overdue tasks
          const overdueTasks = await prisma.task.findMany({
            where: {
              orgId,
              status: { not: "COMPLETED" },
              dueDate: { lt: now },
            },
            include: {
              lead: { select: { firstName: true, lastName: true } },
              contact: { select: { firstName: true, lastName: true } },
              account: { select: { name: true } },
            },
            take: 5,
          });

          overdueTasks.forEach(task => {
            const relatedName = task.lead
              ? `${task.lead.firstName} ${task.lead.lastName}`
              : task.contact
              ? `${task.contact.firstName} ${task.contact.lastName}`
              : task.account?.name || "Unknown";

            suggestions.push({
              type: "overdue_task",
              priority: "high",
              message: `Overdue task: "${task.title}" for ${relatedName}`,
              action: `Complete or reschedule task ${task.id}`,
              entityType: "task",
              entityId: task.id,
              entityName: task.title,
            });
          });

          // Tasks due today
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          const today = new Date(now);
          today.setHours(0, 0, 0, 0);

          const todayTasks = await prisma.task.count({
            where: {
              orgId,
              status: { not: "COMPLETED" },
              dueDate: { gte: today, lt: tomorrow },
            },
          });

          if (todayTasks > 0) {
            suggestions.push({
              type: "today_tasks",
              priority: "medium",
              message: `You have ${todayTasks} task(s) due today`,
              action: "Review and complete today's tasks",
            });
          }
        }

        // Risk suggestions
        if (category === "all" || category === "risk") {
          // Stale leads (no activity in 7+ days)
          const staleLeads = await prisma.lead.findMany({
            where: {
              orgId,
              status: { in: ["NEW", "CONTACTED", "QUALIFIED"] },
              updatedAt: { lt: sevenDaysAgo },
            },
            select: { id: true, firstName: true, lastName: true, status: true, updatedAt: true },
            take: 5,
          });

          staleLeads.forEach(lead => {
            suggestions.push({
              type: "stale_lead",
              priority: "medium",
              message: `Lead ${lead.firstName} ${lead.lastName} hasn't been updated in over 7 days`,
              action: "Follow up or update lead status",
              entityType: "lead",
              entityId: lead.id,
              entityName: `${lead.firstName} ${lead.lastName}`,
            });
          });

          // Check for at-risk renewals (due in 30 days)
          const upcomingRenewals = await prisma.renewal.findMany({
            where: {
              orgId,
              status: { in: ["UPCOMING", "IN_PROGRESS"] },
              endDate: { lte: thirtyDaysFromNow, gte: now },
            },
            include: {
              account: { select: { id: true, name: true } },
            },
            take: 5,
          });

          upcomingRenewals.forEach(renewal => {
            const daysUntil = Math.ceil((renewal.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            suggestions.push({
              type: "upcoming_renewal",
              priority: daysUntil <= 7 ? "high" : "medium",
              message: `Renewal for ${renewal.account.name} due in ${daysUntil} days`,
              action: "Review and prepare renewal",
              entityType: "renewal",
              entityId: renewal.id,
              entityName: renewal.account.name,
            });
          });
        }

        // Follow-up suggestions
        if (category === "all" || category === "followup") {
          // Leads waiting for response
          const waitingLeads = await prisma.lead.findMany({
            where: {
              orgId,
              status: "CONTACTED",
              updatedAt: { lt: threeDaysAgo },
            },
            select: { id: true, firstName: true, lastName: true },
            take: 5,
          });

          waitingLeads.forEach(lead => {
            suggestions.push({
              type: "followup_needed",
              priority: "medium",
              message: `Follow up with ${lead.firstName} ${lead.lastName} (contacted 3+ days ago)`,
              action: "Send follow-up or update status",
              entityType: "lead",
              entityId: lead.id,
              entityName: `${lead.firstName} ${lead.lastName}`,
            });
          });

          // Open tickets without recent updates
          const staleTickets = await prisma.ticket.findMany({
            where: {
              orgId,
              status: { in: ["OPEN", "IN_PROGRESS"] },
              updatedAt: { lt: threeDaysAgo },
            },
            include: {
              account: { select: { name: true } },
            },
            take: 5,
          });

          staleTickets.forEach(ticket => {
            suggestions.push({
              type: "stale_ticket",
              priority: ticket.priority === "URGENT" || ticket.priority === "HIGH" ? "high" : "medium",
              message: `Ticket "${ticket.subject}" for ${ticket.account?.name || "Unknown"} needs attention`,
              action: "Update or resolve ticket",
              entityType: "ticket",
              entityId: ticket.id,
              entityName: ticket.subject,
            });
          });
        }

        // Opportunity suggestions
        if (category === "all" || category === "opportunity") {
          // High-value opportunities in late stages
          const hotOpportunities = await prisma.opportunity.findMany({
            where: {
              orgId,
              stage: { in: ["PROPOSAL", "NEGOTIATION"] },
            },
            include: {
              account: { select: { name: true } },
            },
            orderBy: { value: "desc" },
            take: 3,
          });

          hotOpportunities.forEach(opp => {
            suggestions.push({
              type: "hot_opportunity",
              priority: "high",
              message: `Opportunity "${opp.name}" ($${opp.value?.toNumber().toLocaleString() || 0}) in ${opp.stage} stage`,
              action: "Push to close",
              entityType: "opportunity",
              entityId: opp.id,
              entityName: opp.name,
            });
          });

          // New leads that should be qualified
          const newLeads = await prisma.lead.count({
            where: {
              orgId,
              status: "NEW",
              createdAt: { gte: threeDaysAgo },
            },
          });

          if (newLeads > 0) {
            suggestions.push({
              type: "new_leads",
              priority: "medium",
              message: `${newLeads} new lead(s) need qualification`,
              action: "Review and qualify new leads",
            });
          }
        }

        // Sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return {
          success: true,
          count: suggestions.length,
          suggestions,
          summary: {
            high: suggestions.filter(s => s.priority === "high").length,
            medium: suggestions.filter(s => s.priority === "medium").length,
            low: suggestions.filter(s => s.priority === "low").length,
          },
          message: suggestions.length > 0
            ? `Found ${suggestions.length} suggestions. ${suggestions.filter(s => s.priority === "high").length} are high priority.`
            : "No suggestions at this time. You're on top of things!",
        };
      } catch (error) {
        return handleToolError(error, "getSuggestions");
      }
    },
  });

const getToolUsageMetricsTool = () =>
  tool({
    description: "Get metrics on AI tool usage patterns. Useful for understanding which tools are used most frequently.",
    parameters: z.object({
      sortBy: z.enum(["calls", "successes", "failures", "recent"]).default("calls")
        .describe("Sort metrics by: 'calls' (total usage), 'successes', 'failures', or 'recent' (last used)"),
    }),
    execute: async ({ sortBy = "calls" }) => {
      logToolExecution("getToolUsageMetrics", { sortBy });
      try {
        const metrics = Array.from(toolUsageStats.entries()).map(([name, stats]) => ({
          toolName: name,
          totalCalls: stats.calls,
          successCount: stats.successes,
          failureCount: stats.failures,
          successRate: stats.calls > 0 ? Math.round((stats.successes / stats.calls) * 100) : 0,
          avgDurationMs: Math.round(stats.avgDuration),
          lastUsed: stats.lastUsed.toISOString(),
        }));

        // Sort based on sortBy parameter
        switch (sortBy) {
          case "calls":
            metrics.sort((a, b) => b.totalCalls - a.totalCalls);
            break;
          case "successes":
            metrics.sort((a, b) => b.successCount - a.successCount);
            break;
          case "failures":
            metrics.sort((a, b) => b.failureCount - a.failureCount);
            break;
          case "recent":
            metrics.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());
            break;
        }

        const totalCalls = metrics.reduce((sum, m) => sum + m.totalCalls, 0);
        const totalSuccesses = metrics.reduce((sum, m) => sum + m.successCount, 0);

        return {
          success: true,
          toolCount: metrics.length,
          metrics,
          summary: {
            totalToolCalls: totalCalls,
            overallSuccessRate: totalCalls > 0 ? Math.round((totalSuccesses / totalCalls) * 100) : 0,
            mostUsedTool: metrics[0]?.toolName || "None",
          },
          message: metrics.length > 0
            ? `Tracked ${totalCalls} tool calls across ${metrics.length} tools. Overall success rate: ${Math.round((totalSuccesses / totalCalls) * 100)}%.`
            : "No tool usage data yet. Metrics will be collected as tools are used.",
        };
      } catch (error) {
        return handleToolError(error, "getToolUsageMetrics");
      }
    },
  });
