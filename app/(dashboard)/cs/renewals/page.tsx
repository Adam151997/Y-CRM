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
import Link from "next/link";
import { 
  Plus, 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";

interface PageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

const statusColors: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  RENEWED: "bg-green-100 text-green-700",
  CHURNED: "bg-red-100 text-red-700",
  DOWNGRADED: "bg-orange-100 text-orange-700",
  EXPANDED: "bg-emerald-100 text-emerald-700",
};

function formatCurrency(value: number | null, currency: string = "USD"): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function RenewalsPage({ searchParams }: PageProps) {
  const { orgId } = await getAuthContext();
  const params = await searchParams;
  const statusFilter = params.status;

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  if (statusFilter && statusFilter !== "_all") {
    where.status = statusFilter;
  }

  // Fetch renewals
  const renewals = await prisma.renewal.findMany({
    where,
    orderBy: { endDate: "asc" },
    include: {
      account: { select: { id: true, name: true } },
    },
  });

  // Calculate stats
  const now = new Date();
  const stats = {
    total: renewals.length,
    upcoming: renewals.filter(r => r.status === "UPCOMING").length,
    inProgress: renewals.filter(r => r.status === "IN_PROGRESS").length,
    dueSoon: renewals.filter(r => {
      const daysUntil = differenceInDays(new Date(r.endDate), now);
      return daysUntil <= 30 && daysUntil >= 0 && r.status !== "RENEWED";
    }).length,
    totalValue: renewals
      .filter(r => r.status === "UPCOMING" || r.status === "IN_PROGRESS")
      .reduce((sum, r) => sum + Number(r.contractValue), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Renewals</h1>
          <p className="text-muted-foreground">
            Track contract renewals and retention
          </p>
        </div>
        <Button asChild>
          <Link href="/cs/renewals/new">
            <Plus className="h-4 w-4 mr-2" />
            New Renewal
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">upcoming renewals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Due in 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.dueSoon}</div>
            <p className="text-xs text-muted-foreground">renewals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">negotiations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">total</p>
          </CardContent>
        </Card>
      </div>

      {/* Renewals Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Renewals</CardTitle>
              <CardDescription>{renewals.length} contracts</CardDescription>
            </div>
            <form>
              <Select name="status" defaultValue={statusFilter || "_all"}>
                <SelectTrigger className="w-[160px]">
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
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {renewals.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No renewals found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {statusFilter ? "Try adjusting your filter" : "Start tracking contract renewals"}
              </p>
              {!statusFilter && (
                <Button asChild>
                  <Link href="/cs/renewals/new">Add Renewal</Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Contract Value</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Days Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renewals.map((renewal) => {
                  const daysUntil = differenceInDays(new Date(renewal.endDate), now);
                  const isOverdue = daysUntil < 0;
                  const isDueSoon = daysUntil <= 30 && daysUntil >= 0;

                  return (
                    <TableRow key={renewal.id}>
                      <TableCell>
                        <Link
                          href={`/cs/accounts/${renewal.account.id}`}
                          className="font-medium hover:underline"
                        >
                          {renewal.account.name}
                        </Link>
                        {renewal.contractName && (
                          <p className="text-xs text-muted-foreground">
                            {renewal.contractName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(Number(renewal.contractValue), renewal.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(renewal.endDate), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[renewal.status]}>
                          {renewal.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                renewal.probability >= 70 
                                  ? "bg-green-500" 
                                  : renewal.probability >= 40 
                                    ? "bg-yellow-500" 
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${renewal.probability}%` }}
                            />
                          </div>
                          <span className="text-sm">{renewal.probability}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {renewal.status === "RENEWED" || renewal.status === "CHURNED" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : isOverdue ? (
                          <Badge variant="destructive">
                            Overdue by {Math.abs(daysUntil)} days
                          </Badge>
                        ) : isDueSoon ? (
                          <Badge variant="secondary" className="text-orange-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {daysUntil} days
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{daysUntil} days</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
