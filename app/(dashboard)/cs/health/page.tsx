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
  HeartPulse,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PageProps {
  searchParams: Promise<{
    riskLevel?: string;
  }>;
}

const riskLevelColors: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const riskLevelIcons: Record<string, React.ReactNode> = {
  LOW: <CheckCircle className="h-4 w-4 text-green-500" />,
  MEDIUM: <Minus className="h-4 w-4 text-yellow-500" />,
  HIGH: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  CRITICAL: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

export default async function HealthScoresPage({ searchParams }: PageProps) {
  const { orgId } = await getAuthContext();
  const params = await searchParams;
  const riskLevelFilter = params.riskLevel;

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  if (riskLevelFilter && riskLevelFilter !== "_all") {
    where.riskLevel = riskLevelFilter;
  }

  // Fetch health scores
  const healthScores = await prisma.accountHealth.findMany({
    where,
    orderBy: { score: "asc" },
    include: {
      account: { 
        select: { 
          id: true, 
          name: true, 
          type: true,
          _count: { select: { opportunities: true } }
        } 
      },
    },
  });

  // Calculate summary stats
  const summary = {
    total: healthScores.length,
    critical: healthScores.filter(h => h.riskLevel === "CRITICAL").length,
    high: healthScores.filter(h => h.riskLevel === "HIGH").length,
    medium: healthScores.filter(h => h.riskLevel === "MEDIUM").length,
    low: healthScores.filter(h => h.riskLevel === "LOW").length,
    avgScore: healthScores.length > 0 
      ? Math.round(healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length)
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Health Scores</h1>
          <p className="text-muted-foreground">
            Monitor customer health and identify at-risk accounts
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Recalculate All
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgScore}</div>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
            <p className="text-xs text-muted-foreground">accounts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.high}</div>
            <p className="text-xs text-muted-foreground">accounts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Medium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.medium}</div>
            <p className="text-xs text-muted-foreground">accounts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Healthy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.low}</div>
            <p className="text-xs text-muted-foreground">accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Scores Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Health</CardTitle>
              <CardDescription>{summary.total} accounts tracked</CardDescription>
            </div>
            <form>
              <Select name="riskLevel" defaultValue={riskLevelFilter || "_all"}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Levels</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High Risk</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Healthy</SelectItem>
                </SelectContent>
              </Select>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {healthScores.length === 0 ? (
            <div className="text-center py-12">
              <HeartPulse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No health scores yet</h3>
              <p className="text-sm text-muted-foreground">
                Health scores will appear as accounts are tracked
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Health Score</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Open Tickets</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {healthScores.map((health) => {
                  // Calculate trend
                  const trend = health.previousScore 
                    ? health.score - health.previousScore 
                    : 0;
                  
                  return (
                    <TableRow key={health.id}>
                      <TableCell>
                        <Link
                          href={`/cs/accounts/${health.account.id}`}
                          className="font-medium hover:underline"
                        >
                          {health.account.name}
                        </Link>
                        {health.account.type && (
                          <p className="text-xs text-muted-foreground">
                            {health.account.type}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                health.score >= 70 
                                  ? "bg-green-500" 
                                  : health.score >= 40 
                                    ? "bg-yellow-500" 
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${health.score}%` }}
                            />
                          </div>
                          <span className="font-medium">{health.score}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={riskLevelColors[health.riskLevel]}>
                          {riskLevelIcons[health.riskLevel]}
                          <span className="ml-1">{health.riskLevel}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {trend !== 0 && (
                          <div className={`flex items-center gap-1 text-sm ${
                            trend > 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {trend > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {trend > 0 ? "+" : ""}{trend}
                          </div>
                        )}
                        {trend === 0 && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {health.openTicketCount > 0 ? (
                          <Badge variant="secondary">{health.openTicketCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(health.updatedAt), { addSuffix: true })}
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
