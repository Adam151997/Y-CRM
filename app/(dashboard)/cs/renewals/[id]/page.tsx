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
  Calendar,
  DollarSign,
  User,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { RenewalActions } from "./_components/renewal-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  RENEWED: "bg-green-100 text-green-700",
  CHURNED: "bg-red-100 text-red-700",
  DOWNGRADED: "bg-orange-100 text-orange-700",
  EXPANDED: "bg-emerald-100 text-emerald-700",
};

const outcomeIcons: Record<string, React.ElementType> = {
  RENEWED: CheckCircle,
  CHURNED: XCircle,
  DOWNGRADED: TrendingDown,
  EXPANDED: TrendingUp,
};

export default async function RenewalDetailPage({ params }: PageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const renewal = await prisma.renewal.findFirst({
    where: { id, orgId },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          industry: true,
          type: true,
        },
      },
    },
  });

  if (!renewal) {
    notFound();
  }

  // Get account health
  const health = await prisma.accountHealth.findFirst({
    where: { accountId: renewal.accountId },
  });

  // Calculate days until renewal
  const daysUntil = differenceInDays(new Date(renewal.endDate), new Date());
  const isOverdue = daysUntil < 0;
  const isUrgent = daysUntil <= 30 && daysUntil >= 0;

  // Get related tickets
  const recentTickets = await prisma.ticket.findMany({
    where: {
      accountId: renewal.accountId,
      status: { in: ["NEW", "OPEN", "PENDING"] },
    },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  const OutcomeIcon = renewal.outcome ? outcomeIcons[renewal.outcome] : null;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/cs/renewals">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Renewals
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">
              {renewal.contractName || `${renewal.account.name} Renewal`}
            </h1>
            <Badge className={statusColors[renewal.status]}>
              {renewal.status.replace("_", " ")}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <Link 
              href={`/cs/accounts/${renewal.account.id}`}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Building2 className="h-4 w-4" />
              {renewal.account.name}
            </Link>
            <span>•</span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              ${Number(renewal.contractValue).toLocaleString()} {renewal.currency}
            </span>
          </div>
        </div>
        <RenewalActions renewal={renewal} />
      </div>

      {/* Urgency Banner */}
      {(isOverdue || isUrgent) && renewal.status !== "RENEWED" && renewal.status !== "CHURNED" && (
        <Card className={isOverdue ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 ${isOverdue ? "text-red-500" : "text-yellow-500"}`} />
              <div>
                <p className="font-medium">
                  {isOverdue 
                    ? `Contract expired ${Math.abs(daysUntil)} days ago`
                    : `Contract expires in ${daysUntil} days`
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {isOverdue 
                    ? "Immediate action required to retain this customer"
                    : "Schedule a renewal discussion soon"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Contract Period</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(renewal.startDate), "MMM d, yyyy")} - {format(new Date(renewal.endDate), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Contract Value</p>
                    <p className="text-sm">
                      ${Number(renewal.contractValue).toLocaleString()} {renewal.currency}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Time Remaining</p>
                    <p className={`text-sm ${isOverdue ? "text-red-600" : isUrgent ? "text-yellow-600" : ""}`}>
                      {isOverdue 
                        ? `Expired ${formatDistanceToNow(new Date(renewal.endDate), { addSuffix: true })}`
                        : formatDistanceToNow(new Date(renewal.endDate), { addSuffix: true })
                      }
                    </p>
                  </div>
                </div>

                {renewal.ownerUserId && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Owner</p>
                      <p className="text-sm text-muted-foreground">CSM Assigned</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Probability */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Renewal Probability</span>
                  <span className="text-sm font-bold">{renewal.probability}%</span>
                </div>
                <Progress value={renewal.probability} className="h-2" />
              </div>

              {/* Renewal Value (if renewed/expanded) */}
              {renewal.renewalValue && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Renewal Value</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        ${Number(renewal.renewalValue).toLocaleString()}
                      </span>
                      {Number(renewal.renewalValue) > Number(renewal.contractValue) ? (
                        <Badge className="bg-green-100 text-green-700">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Expansion
                        </Badge>
                      ) : Number(renewal.renewalValue) < Number(renewal.contractValue) ? (
                        <Badge className="bg-orange-100 text-orange-700">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Downgrade
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {renewal.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{renewal.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Outcome */}
          {renewal.outcome && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {OutcomeIcon && <OutcomeIcon className="h-5 w-5" />}
                  Outcome: {renewal.outcome}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renewal.churnReason && (
                  <div className="mb-3">
                    <p className="text-sm font-medium">Reason</p>
                    <p className="text-sm text-muted-foreground">{renewal.churnReason}</p>
                  </div>
                )}
                {renewal.expansionAmount && (
                  <div>
                    <p className="text-sm font-medium">Expansion Amount</p>
                    <p className="text-sm text-green-600">
                      +${Number(renewal.expansionAmount).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Health */}
          {health && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Health Score</span>
                  <span className={`text-2xl font-bold ${
                    health.score >= 70 ? "text-green-600" : 
                    health.score >= 40 ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {health.score}/100
                  </span>
                </div>
                <Progress value={health.score} className="h-2 mb-2" />
                <Badge className={statusColors[health.riskLevel] || "bg-slate-100"}>
                  {health.riskLevel} RISK
                </Badge>
                <div className="mt-3">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/cs/health/${renewal.accountId}`}>
                      View Health Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Open Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Open Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTickets.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">No open tickets</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/cs/tickets/${ticket.id}`}
                      className="block p-2 rounded hover:bg-accent text-sm"
                    >
                      #{ticket.ticketNumber} {ticket.subject}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Action */}
          {renewal.nextAction && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Next Action</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{renewal.nextAction}</p>
                {renewal.nextActionDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Due: {format(new Date(renewal.nextActionDate), "MMM d, yyyy")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
