"use client";

import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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
import { SalesOverview } from "./sales-overview";
import { LeadsBySource } from "./leads-by-source";
import { LeadsByStatus } from "./leads-by-status";
import { OpportunitiesByStage } from "./opportunities-by-stage";
import { RecentActivity } from "./recent-activity";
import { InvoiceOverview, InvoicesByStatus, MonthlyRevenue } from "./invoice-analytics";
import { PipelineFunnel } from "./pipeline-funnel";
import { PipelineValueByStage } from "./pipeline-value-by-stage";
import { SalesVelocity } from "./sales-velocity";
import { LeadConversionFunnel } from "./lead-conversion-funnel";
import { ReportFilters, DatePreset, ExportType, getDateRangeFromPreset } from "./report-filters";

interface ReportStats {
  dateRange: {
    start: string;
    end: string;
    preset: string;
  };
  overview: {
    totalLeads: number;
    leadsGrowth: number;
    totalOpportunities: number;
    oppsGrowth: number;
    totalTasks: number;
    completedTasks: number;
    taskCompletionRate: number;
    openPipelineValue: number;
    openPipelineCount: number;
    wonValue: number;
    wonCount: number;
    lostValue: number;
    lostCount: number;
    winRate: number;
  };
  invoices: {
    totalInvoiced: number;
    totalPaid: number;
    totalOverdue: number;
    totalPending: number;
    collectionRate: number;
    byStatus: { status: string; _count: number; _sum: { total: number; amountPaid: number } }[];
    monthlyData: { month: string; invoiced: number; collected: number }[];
  };
  salesVelocity: {
    avgDealSize: number;
    avgSalesCycle: number;
    dealsPerMonth: number;
    winRate: number;
  };
  charts: {
    leadsBySource: { source: string | null; _count: number }[];
    leadsByStatus: { status: string; _count: number }[];
    opportunitiesByStage: { stageId: string; _count: number; _sum: { value: number } }[];
    pipelineFunnel: { name: string; value: number; count: number; color: string }[];
    pipelineValueByStage: { name: string; value: number; count: number; color: string }[];
  };
  stages: { id: string; name: string; color: string | null; order: number }[];
  recentActivity: {
    id: string;
    action: string;
    module: string;
    recordId: string | null;
    actorType: string;
    actorId: string | null;
    createdAt: string;
    metadata: unknown;
  }[];
}

export function ReportsClient() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    getDateRangeFromPreset("thisMonth")
  );

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (preset !== "custom") {
        params.set("preset", preset);
      } else if (dateRange?.from && dateRange?.to) {
        params.set("startDate", dateRange.from.toISOString().split("T")[0]);
        params.set("endDate", dateRange.to.toISOString().split("T")[0]);
      }

      const response = await fetch(`/api/reports/stats?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch report data");
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, [preset, dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleExport = async (type: ExportType, format: "csv" | "json") => {
    try {
      const params = new URLSearchParams();
      params.set("reportType", type);
      params.set("format", format);
      
      if (preset !== "custom") {
        params.set("preset", preset);
      } else if (dateRange?.from && dateRange?.to) {
        params.set("startDate", dateRange.from.toISOString().split("T")[0]);
        params.set("endDate", dateRange.to.toISOString().split("T")[0]);
      }

      const response = await fetch(`/api/reports/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to export report");
      }

      if (format === "json") {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-report.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-report.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(`${type} report exported successfully`);
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export report");
    }
  };

  if (loading && !stats) {
    return <ReportsSkeleton />;
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No data available
      </div>
    );
  }

  const { overview, invoices, salesVelocity, charts, recentActivity } = stats;

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground">
            Track your sales performance and team productivity
          </p>
        </div>
        <ReportFilters
          preset={preset}
          dateRange={dateRange}
          onPresetChange={setPreset}
          onDateRangeChange={setDateRange}
          onExport={handleExport}
          isLoading={loading}
        />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div className={`flex items-center text-xs ${overview.leadsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {overview.leadsGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(overview.leadsGrowth).toFixed(0)}%
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{overview.totalLeads}</p>
              <p className="text-sm text-muted-foreground">Total Leads</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div className={`flex items-center text-xs ${overview.oppsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {overview.oppsGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(overview.oppsGrowth).toFixed(0)}%
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">
                ${overview.openPipelineValue.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Open Pipeline</p>
              <p className="text-xs text-muted-foreground mt-1">
                {overview.openPipelineCount} opportunities
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
                {overview.winRate.toFixed(0)}% win rate
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">
                ${overview.wonValue.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Closed Won</p>
              <p className="text-xs text-muted-foreground mt-1">
                {overview.wonCount} deals
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
                {overview.taskCompletionRate.toFixed(0)}% complete
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{overview.completedTasks}/{overview.totalTasks}</p>
              <p className="text-sm text-muted-foreground">Tasks Completed</p>
              <p className="text-xs text-muted-foreground mt-1">
                {overview.totalTasks - overview.completedTasks} remaining
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
                {invoices.collectionRate.toFixed(0)}% collected
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">${invoices.totalPaid.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Revenue Collected</p>
              <p className="text-xs text-muted-foreground mt-1">
                ${invoices.totalOverdue.toLocaleString()} overdue
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
          <TabsTrigger value="performance">
            <TrendingUp className="h-4 w-4 mr-2" />
            Performance
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
            <PipelineFunnel stages={charts.pipelineFunnel} />
            <PipelineValueByStage data={charts.pipelineValueByStage} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SalesOverview
              openValue={overview.openPipelineValue}
              wonValue={overview.wonValue}
              lostValue={overview.lostValue}
            />
            <OpportunitiesByStage
              data={charts.opportunitiesByStage}
              stages={stats.stages}
            />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SalesVelocity
              avgDealSize={salesVelocity.avgDealSize}
              avgSalesCycle={salesVelocity.avgSalesCycle}
              winRate={salesVelocity.winRate}
              dealsPerMonth={salesVelocity.dealsPerMonth}
            />
            <LeadConversionFunnel data={charts.leadsByStatus.map(s => ({
              status: s.status,
              count: s._count,
            }))} />
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LeadsBySource data={charts.leadsBySource} />
            <LeadsByStatus data={charts.leadsByStatus} />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <RecentActivity activities={recentActivity.map(a => ({
            ...a,
            createdAt: new Date(a.createdAt),
          }))} />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InvoiceOverview
              totalInvoiced={invoices.totalInvoiced}
              totalPaid={invoices.totalPaid}
              totalOverdue={invoices.totalOverdue}
              totalPending={invoices.totalPending}
            />
            <InvoicesByStatus data={invoices.byStatus} />
          </div>
          <MonthlyRevenue data={invoices.monthlyData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-[160px]" />
          <Skeleton className="h-10 w-[280px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-8 w-24 mt-3" />
              <Skeleton className="h-4 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Skeleton className="h-10 w-[400px]" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[350px]" />
        <Skeleton className="h-[350px]" />
      </div>
    </div>
  );
}
