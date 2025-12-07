import { unstable_cache } from "next/cache";
import prisma from "@/lib/db";

/**
 * Cached dashboard stats - revalidates every 30 seconds
 */
export const getCachedDashboardStats = unstable_cache(
  async (orgId: string) => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalLeads,
      newLeadsThisMonth,
      totalContacts,
      totalAccounts,
      openOpportunities,
      opportunityValue,
      pendingTasks,
      completedTasksThisWeek,
    ] = await prisma.$transaction([
      prisma.lead.count({ where: { orgId } }),
      prisma.lead.count({ where: { orgId, createdAt: { gte: startOfMonth } } }),
      prisma.contact.count({ where: { orgId } }),
      prisma.account.count({ where: { orgId } }),
      prisma.opportunity.count({ where: { orgId, closedWon: null } }),
      prisma.opportunity.aggregate({
        where: { orgId, closedWon: null },
        _sum: { value: true },
      }),
      prisma.task.count({
        where: { orgId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      }),
      prisma.task.count({
        where: { orgId, status: "COMPLETED", completedAt: { gte: weekAgo } },
      }),
    ]);

    return {
      totalLeads,
      newLeadsThisMonth,
      totalContacts,
      totalAccounts,
      openOpportunities,
      opportunityValue: Number(opportunityValue._sum.value || 0),
      pendingTasks,
      completedTasksThisWeek,
    };
  },
  ["dashboard-stats"],
  { revalidate: 30, tags: ["dashboard"] }
);

/**
 * Cached recent leads - revalidates every 30 seconds
 */
export const getCachedRecentLeads = unstable_cache(
  async (orgId: string) => {
    return prisma.lead.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  },
  ["recent-leads"],
  { revalidate: 30, tags: ["leads"] }
);

/**
 * Cached upcoming tasks - revalidates every 30 seconds
 */
export const getCachedUpcomingTasks = unstable_cache(
  async (orgId: string) => {
    return prisma.task.findMany({
      where: {
        orgId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { not: null },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: {
        lead: { select: { firstName: true, lastName: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
    });
  },
  ["upcoming-tasks"],
  { revalidate: 30, tags: ["tasks"] }
);

/**
 * Cached pipeline overview - revalidates every 60 seconds
 */
export const getCachedPipelineOverview = unstable_cache(
  async (orgId: string) => {
    const stages = await prisma.pipelineStage.findMany({
      where: { orgId, module: "LEAD" },
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });

    return stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      count: stage._count.leads,
      color: stage.color || "#6B7280",
    }));
  },
  ["pipeline-overview"],
  { revalidate: 60, tags: ["pipeline", "leads"] }
);

/**
 * Cached leads count by status - for filters
 */
export const getCachedLeadCounts = unstable_cache(
  async (orgId: string) => {
    const counts = await prisma.lead.groupBy({
      by: ["status"],
      where: { orgId },
      _count: true,
    });

    return counts.reduce((acc, { status, _count }) => {
      acc[status] = _count;
      return acc;
    }, {} as Record<string, number>);
  },
  ["lead-counts"],
  { revalidate: 30, tags: ["leads"] }
);

/**
 * Cached contacts count
 */
export const getCachedContactsCount = unstable_cache(
  async (orgId: string) => {
    return prisma.contact.count({ where: { orgId } });
  },
  ["contacts-count"],
  { revalidate: 60, tags: ["contacts"] }
);

/**
 * Cached accounts count
 */
export const getCachedAccountsCount = unstable_cache(
  async (orgId: string) => {
    return prisma.account.count({ where: { orgId } });
  },
  ["accounts-count"],
  { revalidate: 60, tags: ["accounts"] }
);

/**
 * Cached opportunity stages - rarely changes
 */
export const getCachedOpportunityStages = unstable_cache(
  async (orgId: string) => {
    return prisma.pipelineStage.findMany({
      where: { orgId, module: "OPPORTUNITY" },
      orderBy: { order: "asc" },
    });
  },
  ["opportunity-stages"],
  { revalidate: 300, tags: ["pipeline"] }
);

/**
 * Cached lead pipeline stages - rarely changes
 */
export const getCachedLeadStages = unstable_cache(
  async (orgId: string) => {
    return prisma.pipelineStage.findMany({
      where: { orgId, module: "LEAD" },
      orderBy: { order: "asc" },
    });
  },
  ["lead-stages"],
  { revalidate: 300, tags: ["pipeline"] }
);
