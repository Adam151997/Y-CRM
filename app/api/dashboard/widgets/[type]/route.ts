import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { startOfDay, endOfDay, addDays, startOfMonth, subMonths } from "date-fns";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { orgId } = await getAuthContext();
    const { type } = await params;
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get("workspace") || "sales";

    switch (type) {
      case "pipeline-value":
        return getPipelineValue(orgId);
      case "leads-by-status":
        return getLeadsByStatus(orgId);
      case "deals-closing":
        return getDealsClosing(orgId);
      case "open-tickets":
        return getOpenTickets(orgId);
      case "health-distribution":
        return getHealthDistribution(orgId);
      case "upcoming-renewals":
        return getUpcomingRenewals(orgId);
      case "tasks-due-today":
        return getTasksDueToday(orgId, workspace);
      case "recent-activity":
        return getRecentActivity(orgId, workspace);
      case "quick-stats":
        return getQuickStats(orgId, workspace);
      default:
        return NextResponse.json({ error: "Unknown widget type" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching widget data:", error);
    return NextResponse.json({ error: "Failed to fetch widget data" }, { status: 500 });
  }
}

// === SALES WIDGETS ===

async function getPipelineValue(orgId: string) {
  // Opportunity uses closedWon: null means open, true/false means closed
  const opportunities = await prisma.opportunity.findMany({
    where: {
      orgId,
      closedWon: null, // Open opportunities only
    },
    select: { value: true },
  });

  const totalValue = opportunities.reduce((sum, o) => sum + (o.value?.toNumber() || 0), 0);
  const count = opportunities.length;

  // Calculate change vs last month
  const lastMonthStart = subMonths(startOfMonth(new Date()), 1);
  const lastMonthOpps = await prisma.opportunity.findMany({
    where: {
      orgId,
      createdAt: { gte: lastMonthStart, lt: startOfMonth(new Date()) },
      closedWon: null,
    },
    select: { value: true },
  });
  const lastMonthValue = lastMonthOpps.reduce((sum, o) => sum + (o.value?.toNumber() || 0), 0);
  const change = lastMonthValue > 0 ? Math.round(((totalValue - lastMonthValue) / lastMonthValue) * 100) : 0;

  return NextResponse.json({ totalValue, count, change, currency: "USD" });
}

async function getLeadsByStatus(orgId: string) {
  const leads = await prisma.lead.groupBy({
    by: ["status"],
    where: { orgId },
    _count: { status: true },
  });

  const total = leads.reduce((sum, l) => sum + l._count.status, 0);
  const statuses = leads.map((l) => ({
    status: l.status,
    count: l._count.status,
    percentage: total > 0 ? Math.round((l._count.status / total) * 100) : 0,
  }));

  return NextResponse.json({ statuses });
}

async function getDealsClosing(orgId: string) {
  const thirtyDaysFromNow = addDays(new Date(), 30);

  // Use expectedCloseDate and closedWon for filtering
  const opportunities = await prisma.opportunity.findMany({
    where: {
      orgId,
      closedWon: null, // Open opportunities only
      expectedCloseDate: { lte: thirtyDaysFromNow },
    },
    orderBy: { expectedCloseDate: "asc" },
    take: 5,
    include: {
      account: { select: { name: true } },
    },
  });

  const deals = opportunities.map((o) => ({
    id: o.id,
    name: o.name,
    value: o.value?.toNumber() || 0,
    probability: o.probability || 50,
    closeDate: o.expectedCloseDate?.toISOString() || new Date().toISOString(),
    accountName: o.account?.name || "Unknown",
  }));

  return NextResponse.json({ deals });
}

// === CS WIDGETS ===

async function getOpenTickets(orgId: string) {
  const tickets = await prisma.ticket.groupBy({
    by: ["priority"],
    where: {
      orgId,
      status: { notIn: ["RESOLVED", "CLOSED"] },
    },
    _count: { priority: true },
  });

  const counts: Record<string, number> = { URGENT: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  tickets.forEach((t) => {
    counts[t.priority] = t._count.priority;
  });

  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

  return NextResponse.json({
    total,
    urgent: counts.URGENT,
    high: counts.HIGH,
    medium: counts.MEDIUM,
    low: counts.LOW,
  });
}

async function getHealthDistribution(orgId: string) {
  const healthScores = await prisma.accountHealth.findMany({
    where: { orgId },
    select: { score: true },
  });

  const buckets = [
    { range: "0-25", count: 0, color: "bg-red-500" },
    { range: "26-50", count: 0, color: "bg-orange-500" },
    { range: "51-75", count: 0, color: "bg-yellow-500" },
    { range: "76-100", count: 0, color: "bg-green-500" },
  ];

  healthScores.forEach((h) => {
    if (h.score <= 25) buckets[0].count++;
    else if (h.score <= 50) buckets[1].count++;
    else if (h.score <= 75) buckets[2].count++;
    else buckets[3].count++;
  });

  return NextResponse.json({ buckets });
}

async function getUpcomingRenewals(orgId: string) {
  const ninetyDaysFromNow = addDays(new Date(), 90);

  const renewals = await prisma.renewal.findMany({
    where: {
      orgId,
      status: { in: ["UPCOMING", "IN_PROGRESS"] },
      endDate: { lte: ninetyDaysFromNow },
    },
    orderBy: { endDate: "asc" },
    take: 5,
    include: {
      account: { select: { name: true } },
    },
  });

  const formatted = renewals.map((r) => ({
    id: r.id,
    contractName: r.contractName,
    accountName: r.account?.name || "Unknown",
    contractValue: r.contractValue?.toNumber() || 0,
    endDate: r.endDate.toISOString(),
    status: r.status,
  }));

  return NextResponse.json({ renewals: formatted });
}

// === GLOBAL WIDGETS ===

async function getTasksDueToday(orgId: string, workspace: string) {
  const today = new Date();

  const whereClause: Record<string, unknown> = {
    orgId,
    dueDate: {
      gte: startOfDay(today),
      lte: endOfDay(today),
    },
    status: { not: "COMPLETED" },
  };
  
  if (workspace !== "all") {
    whereClause.workspace = workspace;
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    take: 10,
    include: {
      lead: { select: { firstName: true, lastName: true } },
      contact: { select: { firstName: true, lastName: true } },
      account: { select: { name: true } },
    },
  });

  const formatted = tasks.map((t) => {
    let relatedTo: string | undefined;
    let relatedType: string | undefined;

    if (t.lead) {
      relatedTo = `${t.lead.firstName} ${t.lead.lastName}`;
      relatedType = "Lead";
    } else if (t.contact) {
      relatedTo = `${t.contact.firstName} ${t.contact.lastName}`;
      relatedType = "Contact";
    } else if (t.account) {
      relatedTo = t.account.name;
      relatedType = "Account";
    }

    return {
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString(),
      relatedTo,
      relatedType,
      completed: t.status === "COMPLETED",
    };
  });

  return NextResponse.json({ tasks: formatted });
}

async function getRecentActivity(orgId: string, workspace: string) {
  const whereClause: Record<string, unknown> = { orgId };
  if (workspace !== "all") {
    whereClause.workspace = workspace;
  }

  // Get recent audit logs for activity context
  const auditLogs = await prisma.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      action: true,
      module: true,
      actorType: true,
      createdAt: true,
    },
  });

  // Format activities
  const formatted = auditLogs.map((log) => ({
    id: log.id,
    type: log.action,
    description: `${log.action} ${log.module.toLowerCase()}`,
    createdAt: log.createdAt.toISOString(),
    module: log.module,
    actorType: log.actorType,
  }));

  return NextResponse.json({ activities: formatted });
}

async function getQuickStats(orgId: string, workspace: string) {
  const stats: { label: string; value: string | number; change?: number; changeLabel?: string }[] = [];

  if (workspace === "sales") {
    // Sales stats - use closedWon: null for open opportunities
    const [leads, opportunities, accounts, tasks] = await Promise.all([
      prisma.lead.count({ where: { orgId } }),
      prisma.opportunity.count({ where: { orgId, closedWon: null } }),
      prisma.account.count({ where: { orgId } }),
      prisma.task.count({ where: { orgId, status: "PENDING", workspace: "sales" } }),
    ]);

    stats.push(
      { label: "Total Leads", value: leads },
      { label: "Open Deals", value: opportunities },
      { label: "Accounts", value: accounts },
      { label: "Open Tasks", value: tasks }
    );
  } else if (workspace === "cs") {
    // CS stats
    const [tickets, accounts, renewals, atRisk] = await Promise.all([
      prisma.ticket.count({ where: { orgId, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
      prisma.account.count({ where: { orgId } }),
      prisma.renewal.count({ where: { orgId, status: { in: ["UPCOMING", "IN_PROGRESS"] } } }),
      prisma.accountHealth.count({ where: { orgId, isAtRisk: true } }),
    ]);

    stats.push(
      { label: "Open Tickets", value: tickets },
      { label: "Accounts", value: accounts },
      { label: "Renewals", value: renewals },
      { label: "At Risk", value: atRisk }
    );
  } else if (workspace === "marketing") {
    // Marketing stats
    const [campaigns, segments, forms, submissions] = await Promise.all([
      prisma.campaign.count({ where: { orgId, status: "ACTIVE" } }),
      prisma.segment.count({ where: { orgId, isActive: true } }),
      prisma.form.count({ where: { orgId, isActive: true } }),
      prisma.formSubmission.count({ where: { orgId } }),
    ]);

    stats.push(
      { label: "Active Campaigns", value: campaigns },
      { label: "Segments", value: segments },
      { label: "Active Forms", value: forms },
      { label: "Submissions", value: submissions }
    );
  }

  return NextResponse.json({ stats });
}
