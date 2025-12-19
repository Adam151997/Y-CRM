import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Query params schema
const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  preset: z.enum([
    "today",
    "yesterday", 
    "last7days",
    "last30days",
    "thisMonth",
    "lastMonth",
    "thisQuarter",
    "lastQuarter",
    "thisYear",
    "lastYear",
    "allTime",
  ]).optional(),
});

function getDateRange(preset?: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // If custom dates provided, use them
  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate + "T23:59:59.999Z"),
    };
  }

  // Handle presets
  switch (preset) {
    case "today":
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    
    case "yesterday":
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        start: yesterday,
        end: new Date(today.getTime() - 1),
      };
    
    case "last7days":
      return {
        start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: now,
      };
    
    case "last30days":
      return {
        start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now,
      };
    
    case "thisMonth":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
      };
    
    case "lastMonth":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    
    case "thisQuarter":
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarterStart, 1),
        end: now,
      };
    
    case "lastQuarter":
      const lastQuarterStart = Math.floor(now.getMonth() / 3) * 3 - 3;
      const lastQuarterEnd = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), lastQuarterStart, 1),
        end: new Date(now.getFullYear(), lastQuarterEnd, 0, 23, 59, 59, 999),
      };
    
    case "thisYear":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now,
      };
    
    case "lastYear":
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      };
    
    case "allTime":
    default:
      // Default to all time (from 2020 to now)
      return {
        start: new Date(2020, 0, 1),
        end: now,
      };
  }
}

/**
 * GET /api/reports/stats
 * Get report statistics with date range filtering
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      preset: searchParams.get("preset") || undefined,
    };

    const validated = querySchema.parse(params);
    const { start, end } = getDateRange(validated.preset, validated.startDate, validated.endDate);

    const orgId = auth.orgId;
    const dateFilter = { gte: start, lte: end };

    // Fetch all data in parallel
    const [
      counts,
      previousCounts,
      pipelineStats,
      groupedData,
      stages,
      recentActivity,
      invoiceStats,
      salesVelocityData,
    ] = await Promise.all([
      getCounts(orgId, dateFilter),
      getPreviousPeriodCounts(orgId, start, end),
      getPipelineStats(orgId, dateFilter),
      getGroupedData(orgId, dateFilter),
      getStages(orgId),
      getRecentActivity(orgId, dateFilter),
      getInvoiceStats(orgId, dateFilter, start, end),
      getSalesVelocityData(orgId, dateFilter),
    ]);

    // Calculate growth rates
    const leadsGrowth = previousCounts.leads > 0
      ? ((counts.totalLeads - previousCounts.leads) / previousCounts.leads) * 100
      : counts.totalLeads > 0 ? 100 : 0;

    const oppsGrowth = previousCounts.opportunities > 0
      ? ((counts.totalOpportunities - previousCounts.opportunities) / previousCounts.opportunities) * 100
      : counts.totalOpportunities > 0 ? 100 : 0;

    const taskCompletionRate = counts.totalTasks > 0
      ? (counts.completedTasks / counts.totalTasks) * 100
      : 0;

    const winRate = (pipelineStats.wonCount + pipelineStats.lostCount) > 0
      ? (pipelineStats.wonCount / (pipelineStats.wonCount + pipelineStats.lostCount)) * 100
      : 0;

    // Prepare funnel data
    const pipelineFunnelData = stages.map((stage) => {
      const stageData = groupedData.opportunitiesByStage.find(
        (s) => s.stageId === stage.id
      );
      return {
        name: stage.name,
        value: Number(stageData?._sum?.value || 0),
        count: stageData?._count || 0,
        color: stage.color || "#3b82f6",
      };
    });

    return NextResponse.json({
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        preset: validated.preset || "custom",
      },
      overview: {
        totalLeads: counts.totalLeads,
        leadsGrowth,
        totalOpportunities: counts.totalOpportunities,
        oppsGrowth,
        totalTasks: counts.totalTasks,
        completedTasks: counts.completedTasks,
        taskCompletionRate,
        openPipelineValue: pipelineStats.openValue,
        openPipelineCount: pipelineStats.openCount,
        wonValue: pipelineStats.wonValue,
        wonCount: pipelineStats.wonCount,
        lostValue: pipelineStats.lostValue,
        lostCount: pipelineStats.lostCount,
        winRate,
      },
      invoices: {
        totalInvoiced: invoiceStats.totalInvoiced,
        totalPaid: invoiceStats.totalPaid,
        totalOverdue: invoiceStats.totalOverdue,
        totalPending: invoiceStats.totalPending,
        collectionRate: invoiceStats.collectionRate,
        byStatus: invoiceStats.byStatus,
        monthlyData: invoiceStats.monthlyData,
      },
      salesVelocity: {
        avgDealSize: salesVelocityData.avgDealSize,
        avgSalesCycle: salesVelocityData.avgSalesCycle,
        dealsPerMonth: salesVelocityData.dealsPerMonth,
        winRate,
      },
      charts: {
        leadsBySource: groupedData.leadsBySource,
        leadsByStatus: groupedData.leadsByStatus,
        opportunitiesByStage: groupedData.opportunitiesByStage,
        pipelineFunnel: pipelineFunnelData,
        pipelineValueByStage: pipelineFunnelData,
      },
      stages,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching report stats:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch report stats" },
      { status: 500 }
    );
  }
}

// Helper functions

async function getCounts(orgId: string, dateFilter: { gte: Date; lte: Date }) {
  const [totalLeads, totalOpportunities, totalTasks, completedTasks] = await prisma.$transaction([
    prisma.lead.count({ where: { orgId, createdAt: dateFilter } }),
    prisma.opportunity.count({ where: { orgId, createdAt: dateFilter } }),
    prisma.task.count({ where: { orgId, createdAt: dateFilter } }),
    prisma.task.count({ where: { orgId, createdAt: dateFilter, status: "COMPLETED" } }),
  ]);

  return { totalLeads, totalOpportunities, totalTasks, completedTasks };
}

async function getPreviousPeriodCounts(orgId: string, start: Date, end: Date) {
  const duration = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - duration);
  const previousEnd = new Date(start.getTime() - 1);
  const previousFilter = { gte: previousStart, lte: previousEnd };

  const [leads, opportunities] = await prisma.$transaction([
    prisma.lead.count({ where: { orgId, createdAt: previousFilter } }),
    prisma.opportunity.count({ where: { orgId, createdAt: previousFilter } }),
  ]);

  return { leads, opportunities };
}

async function getPipelineStats(orgId: string, dateFilter: { gte: Date; lte: Date }) {
  const [open, won, lost] = await prisma.$transaction([
    prisma.opportunity.aggregate({
      where: { orgId, createdAt: dateFilter, closedWon: null },
      _sum: { value: true },
      _count: true,
    }),
    prisma.opportunity.aggregate({
      where: { orgId, actualCloseDate: dateFilter, closedWon: true },
      _sum: { value: true },
      _count: true,
    }),
    prisma.opportunity.aggregate({
      where: { orgId, actualCloseDate: dateFilter, closedWon: false },
      _sum: { value: true },
      _count: true,
    }),
  ]);

  return {
    openValue: Number(open._sum.value || 0),
    openCount: open._count,
    wonValue: Number(won._sum.value || 0),
    wonCount: won._count,
    lostValue: Number(lost._sum.value || 0),
    lostCount: lost._count,
  };
}

async function getGroupedData(orgId: string, dateFilter: { gte: Date; lte: Date }) {
  const [leadsBySource, leadsByStatus, opportunitiesByStage] = await prisma.$transaction([
    prisma.lead.groupBy({
      by: ["source"],
      where: { orgId, createdAt: dateFilter },
      orderBy: { source: "asc" },
      _count: true,
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { orgId, createdAt: dateFilter },
      orderBy: { status: "asc" },
      _count: true,
    }),
    prisma.opportunity.groupBy({
      by: ["stageId"],
      where: { orgId, createdAt: dateFilter },
      orderBy: { stageId: "asc" },
      _count: true,
      _sum: { value: true },
    }),
  ]);

  return { leadsBySource, leadsByStatus, opportunitiesByStage };
}

async function getStages(orgId: string) {
  return prisma.pipelineStage.findMany({
    where: { orgId, module: "OPPORTUNITY" },
    orderBy: { order: "asc" },
  });
}

async function getRecentActivity(orgId: string, dateFilter: { gte: Date; lte: Date }) {
  return prisma.auditLog.findMany({
    where: { orgId, createdAt: dateFilter },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

async function getInvoiceStats(
  orgId: string, 
  dateFilter: { gte: Date; lte: Date },
  start: Date,
  end: Date
) {
  const now = new Date();
  
  const [paidInvoices, overdueInvoices, pendingInvoices, byStatus, allInvoices] = await prisma.$transaction([
    prisma.invoice.aggregate({
      where: { orgId, paidAt: dateFilter, status: "PAID" },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { 
        orgId,
        issueDate: dateFilter,
        status: { in: ["SENT", "PARTIALLY_PAID"] },
        dueDate: { lt: now },
      },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { 
        orgId,
        issueDate: dateFilter,
        status: { in: ["SENT", "PARTIALLY_PAID"] },
        dueDate: { gte: now },
      },
      _sum: { total: true },
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { orgId, issueDate: dateFilter },
      orderBy: { status: "asc" },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { orgId, issueDate: dateFilter, status: { not: "DRAFT" } },
      _sum: { total: true },
    }),
  ]);

  const totalPaid = Number(paidInvoices._sum.total || 0);
  const totalOverdue = Number(overdueInvoices._sum.total || 0);
  const totalPending = Number(pendingInvoices._sum.total || 0);
  const totalInvoiced = Number(allInvoices._sum.total || 0);
  const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

  // Get monthly data within the date range
  const monthlyData: { month: string; invoiced: number; collected: number }[] = [];
  const monthDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const monthsToShow = Math.min(Math.max(monthDiff + 1, 1), 12);
  
  for (let i = monthsToShow - 1; i >= 0; i--) {
    const monthStart = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const monthEnd = new Date(end.getFullYear(), end.getMonth() - i + 1, 0, 23, 59, 59, 999);
    
    // Skip months outside our date range
    if (monthEnd < start || monthStart > end) continue;
    
    const monthName = monthStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    const [invoiced, collected] = await prisma.$transaction([
      prisma.invoice.aggregate({
        where: {
          orgId,
          issueDate: { gte: monthStart, lte: monthEnd },
          status: { not: "DRAFT" },
        },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          orgId,
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountPaid: true },
      }),
    ]);

    monthlyData.push({
      month: monthName,
      invoiced: Number(invoiced._sum.total || 0),
      collected: Number(collected._sum.amountPaid || 0),
    });
  }

  const transformedByStatus = byStatus.map(item => ({
    status: item.status,
    _count: item._count?._all ?? 0,
    _sum: { total: Number(item._sum?.total || 0) },
  }));

  return {
    totalInvoiced,
    totalPaid,
    totalOverdue,
    totalPending,
    collectionRate,
    byStatus: transformedByStatus,
    monthlyData,
  };
}

async function getSalesVelocityData(orgId: string, dateFilter: { gte: Date; lte: Date }) {
  const wonOpportunities = await prisma.opportunity.findMany({
    where: {
      orgId,
      closedWon: true,
      actualCloseDate: dateFilter,
    },
    select: {
      value: true,
      createdAt: true,
      actualCloseDate: true,
    },
  });

  const avgDealSize = wonOpportunities.length > 0
    ? wonOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0) / wonOpportunities.length
    : 0;

  const salesCycles = wonOpportunities
    .filter(opp => opp.actualCloseDate)
    .map(opp => {
      const created = new Date(opp.createdAt);
      const closed = new Date(opp.actualCloseDate!);
      return Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    });
  
  const avgSalesCycle = salesCycles.length > 0
    ? salesCycles.reduce((sum, days) => sum + days, 0) / salesCycles.length
    : 30;

  // Calculate duration in months
  const duration = (dateFilter.lte.getTime() - dateFilter.gte.getTime()) / (1000 * 60 * 60 * 24 * 30);
  const dealsPerMonth = duration > 0 ? wonOpportunities.length / duration : wonOpportunities.length;

  return {
    avgDealSize,
    avgSalesCycle,
    dealsPerMonth,
  };
}
