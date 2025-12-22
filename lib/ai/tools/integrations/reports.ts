/**
 * Report Generation Tools
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { logToolExecution, handleToolError } from "../helpers";

export function createReportTools(orgId: string, userId: string) {
  return {
    createReport: createReportTool(orgId, userId),
  };
}

const createReportTool = (orgId: string, userId: string) =>
  tool({
    description: "Generate a comprehensive CRM report and save it as a document. Can create reports for specific workspaces (sales, cs, marketing) or across all workspaces. Reports include key metrics, trends, and insights.",
    parameters: z.object({
      title: z.string().describe("Report title (e.g., 'Q4 Sales Performance Report')"),
      workspace: z.enum(["sales", "cs", "marketing", "all"]).default("all").describe("Workspace to report on"),
      reportType: z.enum([
        "summary",
        "pipeline",
        "performance",
        "health",
        "renewals",
        "campaigns",
        "custom",
      ]).default("summary"),
      dateRange: z.enum(["today", "week", "month", "quarter", "year", "all"]).default("month"),
    }),
    execute: async ({ title, workspace, reportType, dateRange }) => {
      logToolExecution("createReport", { title, workspace, reportType, dateRange });
      try {
        const now = new Date();
        let startDate: Date | null = null;

        switch (dateRange) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case "quarter":
            startDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
          case "year":
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        }

        const dateFilter = startDate ? { gte: startDate } : undefined;
        const reportData: Record<string, unknown> = {
          title,
          generatedAt: new Date().toISOString(),
          workspace,
          reportType,
          dateRange,
        };

        // Sales data
        if (workspace === "all" || workspace === "sales") {
          const [totalLeads, newLeads, convertedLeads] = await Promise.all([
            prisma.lead.count({ where: { orgId } }),
            prisma.lead.count({ where: { orgId, createdAt: dateFilter } }),
            prisma.lead.count({ where: { orgId, status: "CONVERTED", convertedAt: dateFilter } }),
          ]);

          const [openOpportunities, wonOpportunities] = await Promise.all([
            prisma.opportunity.aggregate({
              where: { orgId, closedWon: null },
              _count: true,
              _sum: { value: true },
            }),
            prisma.opportunity.aggregate({
              where: { orgId, closedWon: true, actualCloseDate: dateFilter },
              _count: true,
              _sum: { value: true },
            }),
          ]);

          reportData.sales = {
            totalLeads,
            newLeads,
            convertedLeads,
            conversionRate: totalLeads > 0 ? `${((convertedLeads / totalLeads) * 100).toFixed(1)}%` : "0%",
            openOpportunities: openOpportunities._count,
            pipelineValue: Number(openOpportunities._sum.value || 0),
            wonOpportunities: wonOpportunities._count,
            wonValue: Number(wonOpportunities._sum.value || 0),
          };
        }

        // CS data
        if (workspace === "all" || workspace === "cs") {
          const [openTickets, resolvedTickets, atRiskAccounts] = await Promise.all([
            prisma.ticket.count({ where: { orgId, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
            prisma.ticket.count({ where: { orgId, status: { in: ["RESOLVED", "CLOSED"] }, resolvedAt: dateFilter } }),
            prisma.accountHealth.count({ where: { orgId, isAtRisk: true } }),
          ]);

          reportData.cs = {
            openTickets,
            resolvedTickets,
            atRiskAccounts,
          };
        }

        // Marketing data
        if (workspace === "all" || workspace === "marketing") {
          const [activeCampaigns, activeSegments, activeForms] = await Promise.all([
            prisma.campaign.count({ where: { orgId, status: "ACTIVE" } }),
            prisma.segment.count({ where: { orgId, isActive: true } }),
            prisma.form.count({ where: { orgId, isActive: true } }),
          ]);

          reportData.marketing = {
            activeCampaigns,
            activeSegments,
            activeForms,
          };
        }

        // Generate report content
        const reportContent = generateReportMarkdown(reportData);

        // Save as document
        const document = await prisma.document.create({
          data: {
            orgId,
            name: `${title}.md`,
            type: "OTHER",
            fileUrl: "",
            fileKey: `reports/${Date.now()}-${title.toLowerCase().replace(/\s+/g, "-")}.md`,
            fileSize: Buffer.byteLength(reportContent, "utf8"),
            mimeType: "text/markdown",
            uploadedById: userId,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "DOCUMENT",
          recordId: document.id,
          actorType: "AI_AGENT",
          actorId: userId,
          metadata: { source: "ai_assistant", reportType, workspace },
        });

        return {
          success: true,
          documentId: document.id,
          title,
          message: `Generated "${title}" report covering ${workspace === "all" ? "all workspaces" : workspace}`,
          reportData,
          reportContent,
        };
      } catch (error) {
        return handleToolError(error, "createReport");
      }
    },
  });

/**
 * Generate markdown report content from data
 */
function generateReportMarkdown(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const title = data.title as string;
  const generatedAt = new Date(data.generatedAt as string).toLocaleString();
  const workspace = data.workspace as string;
  const dateRange = data.dateRange as string;

  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`**Generated:** ${generatedAt}`);
  lines.push(`**Scope:** ${workspace === "all" ? "All Workspaces" : workspace.toUpperCase()}`);
  lines.push(`**Period:** ${dateRange}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Sales Section
  const sales = data.sales as Record<string, unknown> | undefined;
  if (sales) {
    lines.push("## Sales Performance");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|-------|");
    lines.push(`| Total Leads | ${sales.totalLeads} |`);
    lines.push(`| New Leads | ${sales.newLeads} |`);
    lines.push(`| Converted Leads | ${sales.convertedLeads} |`);
    lines.push(`| Conversion Rate | ${sales.conversionRate} |`);
    lines.push(`| Open Opportunities | ${sales.openOpportunities} |`);
    lines.push(`| Pipeline Value | $${Number(sales.pipelineValue).toLocaleString()} |`);
    lines.push(`| Won Opportunities | ${sales.wonOpportunities} |`);
    lines.push(`| Won Value | $${Number(sales.wonValue).toLocaleString()} |`);
    lines.push("");
  }

  // CS Section
  const cs = data.cs as Record<string, unknown> | undefined;
  if (cs) {
    lines.push("## Customer Success");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|-------|");
    lines.push(`| Open Tickets | ${cs.openTickets} |`);
    lines.push(`| Resolved Tickets | ${cs.resolvedTickets} |`);
    lines.push(`| At-Risk Accounts | ${cs.atRiskAccounts} |`);
    lines.push("");
  }

  // Marketing Section
  const marketing = data.marketing as Record<string, unknown> | undefined;
  if (marketing) {
    lines.push("## Marketing");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|-------|");
    lines.push(`| Active Campaigns | ${marketing.activeCampaigns} |`);
    lines.push(`| Active Segments | ${marketing.activeSegments} |`);
    lines.push(`| Active Forms | ${marketing.activeForms} |`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("*Report generated by Y-CRM AI Assistant*");

  return lines.join("\n");
}
