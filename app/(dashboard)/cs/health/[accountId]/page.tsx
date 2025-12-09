import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { 
  ArrowLeft, 
  Building2, 
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ticket,
  Users,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface PageProps {
  params: Promise<{ accountId: string }>;
}

const riskColors: Record<string, string> = {
  LOW: "bg-green-500",
  MEDIUM: "bg-yellow-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

const riskBadgeColors: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

function ScoreCard({ 
  title, 
  score, 
  icon: Icon,
  description 
}: { 
  title: string; 
  score: number; 
  icon: React.ElementType;
  description?: string;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
        </div>
        <Progress value={score} className="h-2" />
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AccountHealthDetailPage({ params }: PageProps) {
  const { orgId } = await getAuthContext();
  const { accountId } = await params;

  // Fetch account with health data
  const account = await prisma.account.findFirst({
    where: { id: accountId, orgId },
    include: {
      health: true,
      tickets: {
        where: { status: { in: ["NEW", "OPEN", "PENDING"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      renewals: {
        where: { status: { in: ["UPCOMING", "IN_PROGRESS"] } },
        orderBy: { endDate: "asc" },
        take: 3,
      },
      contacts: {
        where: { isPrimary: true },
        take: 1,
      },
      _count: {
        select: {
          tickets: true,
          contacts: true,
          opportunities: true,
        },
      },
    },
  });

  if (!account) {
    notFound();
  }

  const health = account.health;

  // Calculate trend (mock for now - would need historical data)
  const getTrendIcon = (current: number, previous: number | null) => {
    if (!previous) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/cs/health">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Health Scores
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{account.name}</h1>
            {health && (
              <Badge className={riskBadgeColors[health.riskLevel]}>
                {health.riskLevel} RISK
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {account.industry || "No industry"} • {account._count.contacts} contacts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/cs/accounts/${account.id}`}>
              View Account
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/cs/tickets/new?accountId=${account.id}`}>
              Create Ticket
            </Link>
          </Button>
        </div>
      </div>

      {health ? (
        <>
          {/* Overall Health Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Overall Health Score</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(health.score, health.previousScore)}
                  <span className={`text-4xl font-bold ${
                    health.score >= 70 ? "text-green-600" : 
                    health.score >= 40 ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {health.score}
                  </span>
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
              </CardTitle>
              <CardDescription>
                Last calculated {formatDistanceToNow(new Date(health.calculatedAt), { addSuffix: true })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress 
                value={health.score} 
                className={`h-4 ${riskColors[health.riskLevel]}`}
              />
              
              {/* Risk Reasons */}
              {health.isAtRisk && health.riskReasons && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Risk Factors</span>
                  </div>
                  <ul className="space-y-1">
                    {(health.riskReasons as string[]).map((reason, idx) => (
                      <li key={idx} className="text-sm text-red-600">• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score Components */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ScoreCard 
              title="Engagement" 
              score={health.engagementScore} 
              icon={TrendingUp}
              description="Login frequency & feature usage"
            />
            <ScoreCard 
              title="Support" 
              score={health.supportScore} 
              icon={Ticket}
              description="Ticket volume & satisfaction"
            />
            <ScoreCard 
              title="Relationship" 
              score={health.relationshipScore} 
              icon={Users}
              description="Contact frequency & meetings"
            />
            <ScoreCard 
              title="Financial" 
              score={health.financialScore} 
              icon={TrendingUp}
              description="Payment history & expansion"
            />
            <ScoreCard 
              title="Adoption" 
              score={health.adoptionScore} 
              icon={CheckCircle}
              description="Feature adoption depth"
            />
          </div>

          {/* Activity Metrics */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Last Login</span>
                  </div>
                  <span className="text-sm font-medium">
                    {health.lastLoginAt 
                      ? formatDistanceToNow(new Date(health.lastLoginAt), { addSuffix: true })
                      : "Never"
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Last Contact</span>
                  </div>
                  <span className="text-sm font-medium">
                    {health.lastContactAt 
                      ? formatDistanceToNow(new Date(health.lastContactAt), { addSuffix: true })
                      : "Never"
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Last Meeting</span>
                  </div>
                  <span className="text-sm font-medium">
                    {health.lastMeetingAt 
                      ? formatDistanceToNow(new Date(health.lastMeetingAt), { addSuffix: true })
                      : "Never"
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Open Tickets</span>
                  </div>
                  <Badge variant={health.openTicketCount > 0 ? "destructive" : "secondary"}>
                    {health.openTicketCount}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Open Tickets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Open Tickets</span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/cs/tickets?accountId=${account.id}`}>View all</Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {account.tickets.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">No open tickets</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {account.tickets.map((ticket) => (
                      <Link
                        key={ticket.id}
                        href={`/cs/tickets/${ticket.id}`}
                        className="flex items-center justify-between p-2 rounded hover:bg-accent"
                      >
                        <div>
                          <p className="text-sm font-medium">#{ticket.ticketNumber} {ticket.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge variant="outline">{ticket.priority}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Renewals */}
          {account.renewals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Upcoming Renewals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {account.renewals.map((renewal) => (
                    <Link
                      key={renewal.id}
                      href={`/cs/renewals/${renewal.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                    >
                      <div>
                        <p className="font-medium">
                          {renewal.contractName || "Contract Renewal"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ends {format(new Date(renewal.endDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${Number(renewal.contractValue).toLocaleString()}
                        </p>
                        <Badge variant="outline">{renewal.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* No Health Data */
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">No Health Data</h3>
            <p className="text-muted-foreground mb-4">
              Health score has not been calculated for this account yet.
            </p>
            <Button>Calculate Health Score</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
