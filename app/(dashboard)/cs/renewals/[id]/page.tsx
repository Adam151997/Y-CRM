import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { 
  ArrowLeft, 
  Building2, 
  Calendar,
  Clock,
  DollarSign,
  User,
  FileText,
  HeartPulse,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { RenewalActions } from "./_components/renewal-actions";
import { RenewalStatusUpdate } from "./_components/renewal-status-update";
import { EditRenewalForm } from "./_components/edit-renewal-form";
import { clerkClient } from "@clerk/nextjs/server";

interface PageProps {
  params: Promise<{ id: string }>;
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

const churnReasonLabels: Record<string, string> = {
  COMPETITOR: "Switched to Competitor",
  BUDGET: "Budget Constraints",
  NO_VALUE: "Not Seeing Value",
  PRODUCT_FIT: "Product Fit Issues",
  OTHER: "Other",
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
          website: true,
          health: {
            select: { score: true, riskLevel: true }
          },
        },
      },
    },
  });

  if (!renewal) {
    notFound();
  }

  // Fetch recent activities for this account
  const activities = await prisma.activity.findMany({
    where: {
      orgId,
      accountId: renewal.accountId,
    },
    orderBy: { performedAt: "desc" },
    take: 5,
  });

  // Fetch related tickets
  const openTickets = await prisma.ticket.count({
    where: {
      orgId,
      accountId: renewal.accountId,
      status: { in: ["NEW", "OPEN", "PENDING"] },
    },
  });

  // Fetch owner details
  let ownerName = "Unassigned";
  if (renewal.ownerUserId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(renewal.ownerUserId);
      ownerName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.emailAddresses[0]?.emailAddress || "Unknown";
    } catch {
      ownerName = "Unknown";
    }
  }

  // Fetch team members for editing
  let teamMembers: { id: string; name: string }[] = [];
  try {
    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });
    
    teamMembers = memberships.data.map((m) => ({
      id: m.publicUserData?.userId || "",
      name: `${m.publicUserData?.firstName || ""} ${m.publicUserData?.lastName || ""}`.trim() || 
            m.publicUserData?.identifier || "Unknown",
    })).filter(m => m.id);
  } catch (error) {
    console.error("Failed to fetch team members:", error);
  }

  // Calculate contract duration
  const startDate = new Date(renewal.startDate);
  const endDate = new Date(renewal.endDate);
  const daysRemaining = differenceInDays(endDate, new Date());
  const contractDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(new Date(), startDate);
  const progressPercent = Math.min(100, Math.max(0, (daysElapsed / contractDays) * 100));

  const isCompleted = ["RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"].includes(renewal.status);

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
            <h1 className="text-2xl font-bold">{renewal.account.name}</h1>
            <Badge className={statusColors[renewal.status]}>
              {statusLabels[renewal.status]}
            </Badge>
          </div>
          {renewal.contractName && (
            <p className="text-lg text-muted-foreground">{renewal.contractName}</p>
          )}
        </div>
        <RenewalActions renewal={renewal} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contract Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Value */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Contract Value</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(Number(renewal.contractValue), renewal.currency)}
                  </p>
                </div>
                {renewal.renewalValue && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Renewal Value</p>
                    <p className="text-2xl font-semibold text-green-600">
                      {formatCurrency(Number(renewal.renewalValue), renewal.currency)}
                    </p>
                  </div>
                )}
              </div>

              {/* Contract Period */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {format(startDate, "MMM d, yyyy")}
                  </span>
                  <span className="text-sm font-medium">
                    {daysRemaining > 0 
                      ? `${daysRemaining} days remaining`
                      : daysRemaining === 0
                      ? "Ends today"
                      : `${Math.abs(daysRemaining)} days overdue`
                    }
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {format(endDate, "MMM d, yyyy")}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Probability */}
              {!isCompleted && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Renewal Probability</span>
                    <span className={`text-sm font-bold ${
                      renewal.probability >= 70 ? "text-green-600" :
                      renewal.probability >= 40 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {renewal.probability}%
                    </span>
                  </div>
                  <Progress 
                    value={renewal.probability} 
                    className={`h-3 ${
                      renewal.probability >= 70 ? "[&>div]:bg-green-500" :
                      renewal.probability >= 40 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                    }`}
                  />
                </div>
              )}

              {/* Outcome (if completed) */}
              {isCompleted && (
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Outcome</h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Result:</span>{" "}
                      <Badge className={statusColors[renewal.status]}>
                        {statusLabels[renewal.status]}
                      </Badge>
                    </p>
                    {renewal.churnReason && (
                      <p>
                        <span className="text-muted-foreground">Reason:</span>{" "}
                        {churnReasonLabels[renewal.churnReason] || renewal.churnReason}
                      </p>
                    )}
                    {renewal.expansionAmount && (
                      <p>
                        <span className="text-muted-foreground">Expansion:</span>{" "}
                        <span className="text-green-600 font-medium">
                          +{formatCurrency(Number(renewal.expansionAmount), renewal.currency)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {renewal.notes ? (
                <p className="text-sm whitespace-pre-wrap">{renewal.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No notes added yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Account Activity</CardTitle>
              <CardDescription>
                Latest activities for {renewal.account.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.subject}</p>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.performedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {!isCompleted && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update Status</CardTitle>
              </CardHeader>
              <CardContent>
                <RenewalStatusUpdate 
                  renewal={{
                    id: renewal.id,
                    status: renewal.status,
                    contractValue: Number(renewal.contractValue),
                    currency: renewal.currency,
                  }} 
                />
              </CardContent>
            </Card>
          )}

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Account */}
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Account</p>
                  <Link
                    href={`/cs/accounts/${renewal.account.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {renewal.account.name}
                  </Link>
                  {renewal.account.industry && (
                    <p className="text-xs text-muted-foreground">{renewal.account.industry}</p>
                  )}
                </div>
              </div>

              {/* Health Score */}
              {renewal.account.health && (
                <div className="flex items-start gap-3">
                  <HeartPulse className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Health Score</p>
                    <div className="flex items-center gap-2">
                      <div 
                        className={`h-3 w-3 rounded-full ${
                          renewal.account.health.score >= 70 ? "bg-green-500" :
                          renewal.account.health.score >= 40 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                      />
                      <span className="text-sm">
                        {renewal.account.health.score}/100
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {renewal.account.health.riskLevel}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Owner */}
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Owner</p>
                  <p className="text-sm">{ownerName}</p>
                </div>
              </div>

              {/* Open Tickets */}
              {openTickets > 0 && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Open Tickets</p>
                    <Link
                      href={`/cs/tickets?accountId=${renewal.accountId}`}
                      className="text-sm text-orange-600 hover:underline"
                    >
                      {openTickets} open ticket{openTickets !== 1 ? "s" : ""}
                    </Link>
                  </div>
                </div>
              )}

              <Separator />

              {/* Dates */}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm">
                    {format(new Date(renewal.createdAt), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(renewal.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {renewal.lastContactAt && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Last Contact</p>
                    <p className="text-sm">
                      {format(new Date(renewal.lastContactAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              )}

              {/* Next Action */}
              {renewal.nextAction && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Next Action</p>
                      <p className="text-sm">{renewal.nextAction}</p>
                      {renewal.nextActionDate && (
                        <p className="text-xs text-muted-foreground">
                          Due: {format(new Date(renewal.nextActionDate), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Edit</CardTitle>
            </CardHeader>
            <CardContent>
              <EditRenewalForm 
                renewal={{
                  id: renewal.id,
                  probability: renewal.probability,
                  ownerUserId: renewal.ownerUserId,
                  nextAction: renewal.nextAction,
                  nextActionDate: renewal.nextActionDate?.toISOString() || null,
                  notes: renewal.notes,
                }}
                teamMembers={teamMembers}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
