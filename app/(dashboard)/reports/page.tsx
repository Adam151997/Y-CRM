import { cache } from "react";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  DollarSign,
  CheckSquare,
  BarChart3,
  FileText,
} from "lucide-react";
import { SalesOverview } from "./_components/sales-overview";
import { LeadsBySource } from "./_components/leads-by-source";
import { LeadsByStatus } from "./_components/leads-by-status";
import { OpportunitiesByStage } from "./_components/opportunities-by-stage";
import { RecentActivity } from "./_components/recent-activity";
import { InvoiceOverview, InvoicesByStatus, MonthlyRevenue } from "./_components/invoice-analytics";

export default async function ReportsPage() {
  const { orgId } = await getAuthContext();

  // Fetch all data in parallel with optimized queries
  const [counts, monthlyStats, pipelineStats, groupedData, stages, recentActivity, invoiceStats] = 
    await Promise.all([
      getCounts(orgId),
      getMonthlyStats(orgId),
      getPipelineStats(orgId),
      getGroupedData(orgId),
      getStages(orgId),
      getRecentActivity(orgId),
      getInvoiceStats(orgId),
    ]);

  // Calculate metrics
  const leadsGrowth = monthlyStats.leadsLastMonth > 0
    ? ((monthlyStats.leadsThisMonth - monthlyStats.leadsLastMonth) / monthlyStats.leadsLastMonth) * 100
    : monthlyStats.leadsThisMonth > 0 ? 100 : 0;

  const oppsGrowth = monthlyStats.opportunitiesLastMonth > 0
    ? ((monthlyStats.opportunitiesThisMonth - monthlyStats.opportunitiesLastMonth) / monthlyStats.opportunitiesLastMonth) * 100
    : monthlyStats.opportunitiesThisMonth > 0 ? 100 : 0;

  const taskCompletionRate = counts.totalTasks > 0
    ? (counts.completedTasks / counts.totalTasks) * 100
    : 0;

  const winRate = (pipelineStats.wonCount + pipelineStats.lostCount) > 0
    ? (pipelineStats.wonCount / (pipelineStats.wonCount + pipelineStats.lostCount)) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
        <p className="text-muted-foreground">
          Track your sales performance and team productivity
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div className={`flex items-center text-xs ${leadsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {leadsGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(leadsGrowth).toFixed(0)}%
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{counts.totalLeads}</p>
              <p className="text-sm text-muted-foreground">Total Leads</p>
              <p className="text-xs text-muted-foreground mt-1">
                {monthlyStats.leadsThisMonth} this month
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div className={`flex items-center text-xs ${oppsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {oppsGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(oppsGrowth).toFixed(0)}%
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">
                ${pipelineStats.openValue.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Open Pipeline</p>
              <p className="text-xs text-muted-foreground mt-1">
                {pipelineStats.openCount} opportunities
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Target className="h-5 w-5 text-purple-500" />
              </div>
              <span className="text-xs text-green-500 font-medium">
                {winRate.toFixed(0)}% win rate
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">
                ${pipelineStats.wonValue.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Closed Won</p>
              <p className="text-xs text-muted-foreground mt-1">
                {pipelineStats.wonCount} deals
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <CheckSquare className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-xs text-muted-foreground">
                {taskCompletionRate.toFixed(0)}% complete
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{counts.completedTasks}/{counts.totalTasks}</p>
              <p className="text-sm text-muted-foreground">Tasks Completed</p>
              <p className="text-xs text-muted-foreground mt-1">
                {counts.totalTasks - counts.completedTasks} remaining
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <FileText className="h-5 w-5 text-emerald-500" />
              </div>
              <span className="text-xs text-muted-foreground">
                {invoiceStats.collectionRate.toFixed(0)}% collected
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">${invoiceStats.totalPaid.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Revenue Collected</p>
              <p className="text-xs text-muted-foreground mt-1">
                ${invoiceStats.totalOverdue.toLocaleString()} overdue
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="leads">
            <Users className="h-4 w-4 mr-2" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Target className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SalesOverview
              openValue={pipelineStats.openValue}
              wonValue={pipelineStats.wonValue}
              lostValue={pipelineStats.lostValue}
            />
            <OpportunitiesByStage
              data={groupedData.opportunitiesByStage}
              stages={stages}
            />
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LeadsBySource data={groupedData.leadsBySource} />
            <LeadsByStatus data={groupedData.leadsByStatus} />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <RecentActivity activities={recentActivity} />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InvoiceOverview
              totalInvoiced={invoiceStats.totalInvoiced}
              totalPaid={invoiceStats.totalPaid}
              totalOverdue={invoiceStats.totalOverdue}
              totalPending={invoiceStats.totalPending}
            />
            <InvoicesByStatus data={invoiceStats.byStatus} />
          </div>
          <MonthlyRevenue data={invoiceStats.monthlyData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Get basic counts in a single transaction
 */
const getCounts = cache(async (orgId: string) => {
  const [totalLeads, totalTasks, completedTasks] = await prisma.$transaction([
    prisma.lead.count({ where: { orgId } }),
    prisma.task.count({ where: { orgId } }),
    prisma.task.count({ where: { orgId, status: "COMPLETED" } }),
  ]);

  return { totalLeads, totalTasks, completedTasks };
});

/**
 * Get monthly comparison stats
 */
const getMonthlyStats = cache(async (orgId: string) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [leadsThisMonth, leadsLastMonth, opportunitiesThisMonth, opportunitiesLastMonth] = 
    await prisma.$transaction([
      prisma.lead.count({ where: { orgId, createdAt: { gte: startOfMonth } } }),
      prisma.lead.count({ where: { orgId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.opportunity.count({ where: { orgId, createdAt: { gte: startOfMonth } } }),
      prisma.opportunity.count({ where: { orgId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    ]);

  return { leadsThisMonth, leadsLastMonth, opportunitiesThisMonth, opportunitiesLastMonth };
});

/**
 * Get pipeline stats
 */
const getPipelineStats = cache(async (orgId: string) => {
  const [open, won, lost] = await prisma.$transaction([
    prisma.opportunity.aggregate({
      where: { orgId, closedWon: null },
      _sum: { value: true },
      _count: true,
    }),
    prisma.opportunity.aggregate({
      where: { orgId, closedWon: true },
      _sum: { value: true },
      _count: true,
    }),
    prisma.opportunity.aggregate({
      where: { orgId, closedWon: false },
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
});

/**
 * Get grouped data for charts
 */
const getGroupedData = cache(async (orgId: string) => {
  const [leadsBySource, leadsByStatus, opportunitiesByStage] = await prisma.$transaction([
    prisma.lead.groupBy({
      by: ["source"],
      where: { orgId },
      orderBy: { source: "asc" },
      _count: true,
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { orgId },
      orderBy: { status: "asc" },
      _count: true,
    }),
    prisma.opportunity.groupBy({
      by: ["stageId"],
      where: { orgId },
      orderBy: { stageId: "asc" },
      _count: true,
      _sum: { value: true },
    }),
  ]);

  return { leadsBySource, leadsByStatus, opportunitiesByStage };
});

/**
 * Get pipeline stages
 */
const getStages = cache(async (orgId: string) => {
  return prisma.pipelineStage.findMany({
    where: { orgId, module: "OPPORTUNITY" },
    orderBy: { order: "asc" },
  });
});

/**
 * Get recent activity
 */
const getRecentActivity = cache(async (orgId: string) => {
  return prisma.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
});

/**
 * Get invoice statistics
 */
const getInvoiceStats = cache(async (orgId: string) => {
  const now = new Date();
  
  // Get invoice totals by status
  const [paidInvoices, overdueInvoices, pendingInvoices, byStatus, allInvoices] = await prisma.$transaction([
    // Total paid
    prisma.invoice.aggregate({
      where: { orgId, status: "PAID" },
      _sum: { total: true },
    }),
    // Total overdue
    prisma.invoice.aggregate({
      where: { 
        orgId, 
        status: { in: ["SENT", "PARTIALLY_PAID"] },
        dueDate: { lt: now },
      },
      _sum: { total: true },
    }),
    // Total pending (sent but not overdue)
    prisma.invoice.aggregate({
      where: { 
        orgId, 
        status: { in: ["SENT", "PARTIALLY_PAID"] },
        dueDate: { gte: now },
      },
      _sum: { total: true },
    }),
    // Group by status
    prisma.invoice.groupBy({
      by: ["status"],
      where: { orgId },
      _count: { _all: true },
      _sum: { total: true },
    }),
    // All invoices total
    prisma.invoice.aggregate({
      where: { orgId, status: { not: "DRAFT" } },
      _sum: { total: true },
    }),
  ]);

  const totalPaid = Number(paidInvoices._sum.total || 0);
  const totalOverdue = Number(overdueInvoices._sum.total || 0);
  const totalPending = Number(pendingInvoices._sum.total || 0);
  const totalInvoiced = Number(allInvoices._sum.total || 0);
  const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

  // Get monthly data for the last 6 months
  const monthlyData: { month: string; invoiced: number; collected: number }[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthName = monthStart.toLocaleDateString("en-US", { month: "short" });

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

  // Transform byStatus for component consumption
  const transformedByStatus = byStatus.map(item => ({
    status: item.status,
    _count: item._count._all,
    _sum: { total: item._sum.total },
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
});
