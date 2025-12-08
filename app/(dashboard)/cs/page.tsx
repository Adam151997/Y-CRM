import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Ticket, 
  HeartPulse, 
  AlertTriangle, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";

export default async function CSDashboardPage() {
  const { orgId } = await getAuthContext();

  // Fetch CS metrics
  const [
    ticketStats,
    healthStats,
    renewalStats,
    recentTickets,
    atRiskAccounts,
  ] = await Promise.all([
    // Ticket statistics
    prisma.ticket.groupBy({
      by: ["status"],
      where: { orgId },
      _count: true,
    }),
    // Health score statistics
    prisma.accountHealth.groupBy({
      by: ["riskLevel"],
      where: { orgId },
      _count: true,
    }),
    // Renewal statistics
    prisma.renewal.groupBy({
      by: ["status"],
      where: { orgId },
      _count: true,
    }),
    // Recent tickets
    prisma.ticket.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        account: { select: { name: true } },
      },
    }),
    // At-risk accounts
    prisma.accountHealth.findMany({
      where: { 
        orgId,
        riskLevel: { in: ["HIGH", "CRITICAL"] },
      },
      orderBy: { score: "asc" },
      take: 5,
      include: {
        account: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Calculate ticket metrics
  const openTickets = ticketStats.find(s => s.status === "OPEN")?._count || 0;
  const newTickets = ticketStats.find(s => s.status === "NEW")?._count || 0;
  const pendingTickets = ticketStats.find(s => s.status === "PENDING")?._count || 0;
  const totalActiveTickets = openTickets + newTickets + pendingTickets;

  // Calculate health metrics
  const criticalAccounts = healthStats.find(s => s.riskLevel === "CRITICAL")?._count || 0;
  const highRiskAccounts = healthStats.find(s => s.riskLevel === "HIGH")?._count || 0;
  const totalAtRisk = criticalAccounts + highRiskAccounts;

  // Calculate renewal metrics
  const upcomingRenewals = renewalStats.find(s => s.status === "UPCOMING")?._count || 0;
  const inProgressRenewals = renewalStats.find(s => s.status === "IN_PROGRESS")?._count || 0;

  const priorityColors: Record<string, string> = {
    LOW: "bg-slate-500",
    MEDIUM: "bg-yellow-500",
    HIGH: "bg-orange-500",
    URGENT: "bg-red-500",
  };

  const statusColors: Record<string, string> = {
    NEW: "bg-blue-500",
    OPEN: "bg-yellow-500",
    PENDING: "bg-purple-500",
    RESOLVED: "bg-green-500",
    CLOSED: "bg-slate-500",
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold">Customer Success Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor customer health, support tickets, and renewals
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Tickets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveTickets}</div>
            <p className="text-xs text-muted-foreground">
              {newTickets} new, {openTickets} open, {pendingTickets} pending
            </p>
          </CardContent>
        </Card>

        {/* At-Risk Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">At-Risk Accounts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalAtRisk}</div>
            <p className="text-xs text-muted-foreground">
              {criticalAccounts} critical, {highRiskAccounts} high risk
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Renewals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Renewals</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingRenewals}</div>
            <p className="text-xs text-muted-foreground">
              {inProgressRenewals} in progress
            </p>
          </CardContent>
        </Card>

        {/* Health Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Health Overview</CardTitle>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthStats.reduce((acc, s) => acc + s._count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Accounts tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tickets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Tickets</CardTitle>
              <CardDescription>Latest support requests</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/cs/tickets">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tickets yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/cs/tickets/${ticket.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${priorityColors[ticket.priority]}`} />
                      <div>
                        <p className="font-medium text-sm">#{ticket.ticketNumber} {ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{ticket.account.name}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`${statusColors[ticket.status]} text-white`}>
                      {ticket.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* At-Risk Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>At-Risk Accounts</CardTitle>
              <CardDescription>Accounts needing attention</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/cs/health">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {atRiskAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>All accounts are healthy!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {atRiskAccounts.map((health) => (
                  <Link
                    key={health.id}
                    href={`/cs/accounts/${health.account.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        health.riskLevel === "CRITICAL" 
                          ? "bg-red-500/10 text-red-500" 
                          : "bg-orange-500/10 text-orange-500"
                      }`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{health.account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Score: {health.score}/100
                        </p>
                      </div>
                    </div>
                    <Badge variant={health.riskLevel === "CRITICAL" ? "destructive" : "secondary"}>
                      {health.riskLevel}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/cs/tickets/new">
                <Ticket className="h-5 w-5 mb-2" />
                <span>Create Ticket</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/cs/playbooks">
                <Clock className="h-5 w-5 mb-2" />
                <span>Run Playbook</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/cs/renewals">
                <RefreshCw className="h-5 w-5 mb-2" />
                <span>View Renewals</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/cs/health">
                <HeartPulse className="h-5 w-5 mb-2" />
                <span>Health Scores</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
