import { Suspense } from "react";
import { getAuthContext } from "@/lib/auth";
import {
  getCachedDashboardStats,
  getCachedRecentLeads,
  getCachedUpcomingTasks,
  getCachedPipelineOverview,
} from "@/lib/cache";
import { DashboardStats } from "./_components/dashboard-stats";
import { RecentLeads } from "./_components/recent-leads";
import { UpcomingTasks } from "./_components/upcoming-tasks";
import { RecentActivity } from "./_components/recent-activity";
import { PipelineOverview } from "./_components/pipeline-overview";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";

export default async function DashboardPage() {
  const { orgId } = await getAuthContext();

  // Fetch all dashboard data in parallel using cached queries
  const [stats, recentLeads, upcomingTasks, pipelineData] = await Promise.all([
    getCachedDashboardStats(orgId),
    getCachedRecentLeads(orgId),
    getCachedUpcomingTasks(orgId),
    getCachedPipelineOverview(orgId),
  ]);

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your CRM activity.
        </p>
      </div>

      {/* Stats Grid */}
      <DashboardStats stats={stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Overview - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-64 bg-muted/50 rounded-lg animate-pulse" />}>
            <PipelineOverview data={pipelineData} />
          </Suspense>
        </div>

        {/* Upcoming Tasks */}
        <div>
          <Suspense fallback={<div className="h-64 bg-muted/50 rounded-lg animate-pulse" />}>
            <UpcomingTasks tasks={upcomingTasks} />
          </Suspense>
        </div>
      </div>

      {/* Recent Activity and Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Suspense fallback={<div className="h-64 bg-muted/50 rounded-lg animate-pulse" />}>
          <RecentLeads leads={recentLeads} />
        </Suspense>

        {/* Recent Activity */}
        <Suspense fallback={<div className="h-64 bg-muted/50 rounded-lg animate-pulse" />}>
          <RecentActivity orgId={orgId} />
        </Suspense>
      </div>
    </div>
  );
}
