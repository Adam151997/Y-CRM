import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    upcoming?: string;
    query?: string;
  }>;
}

const statusColors: Record<string, string> = {
  UPCOMING: "bg-blue-500 text-white",
  IN_PROGRESS: "bg-yellow-500 text-white",
  RENEWED: "bg-green-500 text-white",
  CHURNED: "bg-red-500 text-white",
  DOWNGRADED: "bg-orange-500 text-white",
  EXPANDED: "bg-emerald-500 text-white",
};

const statusLabels: Record<string, string> = {
  UPCOMING: "Upcoming",
  IN_PROGRESS: "In Progress",
  RENEWED: "Renewed",
  CHURNED: "Churned",
  DOWNGRADED: "Downgraded",
  EXPANDED: "Expanded",
};

function formatCurrency(value: number | null | undefined, currency: string = "USD"): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getDaysRemaining(endDate: Date): { days: number; label: string; color: string } {
  const days = differenceInDays(new Date(endDate), new Date());
  
  if (days < 0) {
    return { days, label: `${Math.abs(days)}d overdue`, color: "text-red-600" };
  } else if (days === 0) {
    return { days, label: "Today", color: "text-red-600" };
  } else if (days <= 30) {
    return { days, label: `${days}d`, color: "text-red-600" };
  } else if (days <= 60) {
    return { days, label: `${days}d`, color: "text-orange-600" };
  } else if (days <= 90) {
    return { days, label: `${days}d`, color: "text-yellow-600" };
  }
  return { days, label: `${days}d`, color: "text-muted-foreground" };
}

export default async function RenewalsPage({ searchParams }: PageProps) {
  const { orgId } = await getAuthContext();
  const params = await searchParams;

  const page = parseInt(params.page || "1");
  const limit = 20;
  const skip = (page - 1) * limit;
  const statusFilter = params.status;
  const upcomingDays = params.upcoming ? parseInt(params.upcoming) : null;
  const searchQuery = params.query;

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  
  if (statusFilter && statusFilter !== "_all") {
    where.status = statusFilter;
  }
  
  if (upcomingDays) {
    const futureDate = addDays(new Date(), upcomingDays);
    where.endDate = {
      gte: new Date(),
      lte: futureDate,
    };
    if (!statusFilter || statusFilter === "_all") {
      where.status = { in: ["UPCOMING", "IN_PROGRESS"] };
    }
  }
  
  if (searchQuery) {
    where.OR = [
      { contractName: { contains: searchQuery, mode: "insensitive" } },
      { account: { name: { contains: searchQuery, mode: "insensitive" } } },
    ];
  }

  // Fetch renewals
  const [renewals, total] = await Promise.all([
    prisma.renewal.findMany({
      where,
      orderBy: { endDate: "asc" },
      skip,
      take: limit,
      include: {
        account: { 
          select: { 
            id: true, 
            name: true,
            health: {
              select: { score: true, riskLevel: true }
            }
          } 
        },
      },
    }),
    prisma.renewal.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Calculate summary stats
  const stats = await prisma.renewal.groupBy({
    by: ["status"],
    where: { orgId },
    _count: true,
    _sum: { contractValue: true },
  });

  // Calculate ARR at risk (upcoming + in_progress)
  const atRiskStatuses = ["UPCOMING", "IN_PROGRESS"];
  const arrAtRisk = stats
    .filter(s => atRiskStatuses.includes(s.status))
    .reduce((sum, s) => sum + (Number(s._sum.contractValue) || 0), 0);

  // Calculate renewals due next 30 days
  const next30Days = addDays(new Date(), 30);
  const renewalsDue30 = await prisma.renewal.count({
    where: {
      orgId,
      status: { in: ["UPCOMING", "IN_PROGRESS"] },
      endDate: { gte: new Date(), lte: next30Days },
    },
  });

  // Calculate churned value this year
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const churnedThisYear = await prisma.renewal.aggregate({
    where: {
      orgId,
      status: "CHURNED",
      updatedAt: { gte: startOfYear },
    },
    _sum: { contractValue: true },
  });

  // Calculate renewal rate this year
  const completedThisYear = await prisma.renewal.findMany({
    where: {
      orgId,
      status: { in: ["RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"] },
      updatedAt: { gte: startOfYear },
    },
    select: { status: true, contractValue: true },
  });
  
  const renewedValue = completedThisYear
    .filter(r => r.status === "RENEWED" || r.status === "EXPANDED")
    .reduce((sum, r) => sum + (Number(r.contractValue) || 0), 0);
  const totalCompletedValue = completedThisYear
    .reduce((sum, r) => sum + (Number(r.contractValue) || 0), 0);
  const renewalRate = totalCompletedValue > 0 
    ? Math.round((renewedValue / totalCompletedValue) * 100) 
    : 0;

  // Build query string for pagination
  const buildQueryString = (newPage: number) => {
    const queryParams = new URLSearchParams();
    queryParams.set("page", String(newPage));
    if (statusFilter) queryParams.set("status", statusFilter);
    if (upcomingDays) queryParams.set("upcoming", String(upcomingDays));
    if (searchQuery) queryParams.set("query", searchQuery);
    return queryParams.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Renewals</h1>
          <p className="text-muted-foreground">
            Track and manage contract renewals
          </p>
        </div>
        <Button asChild>
          <Link href="/cs/renewals/new">
            <Plus className="h-4 w-4 mr-2" />
            New Renewal
          </Link>
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARR at Risk</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(arrAtRisk)}</div>
            <p className="text-xs text-muted-foreground">
              Upcoming & In Progress
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due in 30 Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renewalsDue30}</div>
            <p className="text-xs text-muted-foreground">
              Renewals requiring action
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renewal Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renewalRate}%</div>
            <p className="text-xs text-muted-foreground">
              This year by value
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churned Value</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(Number(churnedThisYear._sum.contractValue) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lost revenue this year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <form className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    name="query"
                    placeholder="Search by account or contract..."
                    defaultValue={searchQuery}
                    className="pl-9"
                  />
                </div>
                <Select name="status" defaultValue={statusFilter || "_all"}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Status</SelectItem>
                    <SelectItem value="UPCOMING">Upcoming</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RENEWED">Renewed</SelectItem>
                    <SelectItem value="CHURNED">Churned</SelectItem>
                    <SelectItem value="DOWNGRADED">Downgraded</SelectItem>
                    <SelectItem value="EXPANDED">Expanded</SelectItem>
                  </SelectContent>
                </Select>
                <Select name="upcoming" defaultValue={upcomingDays?.toString() || "_all"}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Time Frame" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Time</SelectItem>
                    <SelectItem value="30">Next 30 Days</SelectItem>
                    <SelectItem value="60">Next 60 Days</SelectItem>
                    <SelectItem value="90">Next 90 Days</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" variant="secondary">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renewals.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No renewals found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter || upcomingDays
                  ? "Try adjusting your filters"
                  : "Create your first renewal to track contract renewals"}
              </p>
              {!searchQuery && !statusFilter && !upcomingDays && (
                <Button asChild>
                  <Link href="/cs/renewals/new">Create Renewal</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Probability</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewals.map((renewal) => {
                    const daysInfo = getDaysRemaining(renewal.endDate);
                    const healthScore = renewal.account.health?.score;
                    
                    return (
                      <TableRow key={renewal.id}>
                        <TableCell>
                          <Link
                            href={`/cs/accounts/${renewal.account.id}`}
                            className="font-medium hover:underline"
                          >
                            {renewal.account.name}
                          </Link>
                          {healthScore !== undefined && (
                            <div className="flex items-center gap-1 mt-1">
                              <div 
                                className={`h-2 w-2 rounded-full ${
                                  healthScore >= 70 ? "bg-green-500" :
                                  healthScore >= 40 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                              />
                              <span className="text-xs text-muted-foreground">
                                Health: {healthScore}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/cs/renewals/${renewal.id}`}
                            className="hover:underline"
                          >
                            {renewal.contractName || "—"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(renewal.contractValue), renewal.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(new Date(renewal.endDate), "MMM d, yyyy")}
                            </span>
                            <span className={`text-xs ${daysInfo.color}`}>
                              {daysInfo.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[renewal.status]}>
                            {statusLabels[renewal.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={renewal.probability} className="h-2" />
                            <span className="text-xs text-muted-foreground w-8">
                              {renewal.probability}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {skip + 1}-{Math.min(skip + limit, total)} of {total} renewals
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      asChild={page > 1}
                    >
                      {page > 1 ? (
                        <Link href={`/cs/renewals?${buildQueryString(page - 1)}`}>
                          <ChevronLeft className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span><ChevronLeft className="h-4 w-4" /></span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      asChild={page < totalPages}
                    >
                      {page < totalPages ? (
                        <Link href={`/cs/renewals?${buildQueryString(page + 1)}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span><ChevronRight className="h-4 w-4" /></span>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
