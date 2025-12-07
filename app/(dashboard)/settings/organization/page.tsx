import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building, Users, Target, Zap } from "lucide-react";

const planLimits = {
  FREE: { aiCalls: 100, storage: "1 GB" },
  PRO: { aiCalls: 1000, storage: "10 GB" },
  ENTERPRISE: { aiCalls: 10000, storage: "Unlimited" },
};

const planColors = {
  FREE: "bg-slate-500/10 text-slate-500",
  PRO: "bg-blue-500/10 text-blue-500",
  ENTERPRISE: "bg-purple-500/10 text-purple-500",
};

export default async function OrganizationSettingsPage() {
  const { orgId } = await getAuthContext();

  const [org, stats] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
    }),
    prisma.$transaction([
      prisma.lead.count({ where: { orgId } }),
      prisma.contact.count({ where: { orgId } }),
      prisma.account.count({ where: { orgId } }),
      prisma.opportunity.count({ where: { orgId } }),
      prisma.task.count({ where: { orgId } }),
    ]),
  ]);

  if (!org) {
    return <div>Organization not found</div>;
  }

  const [leadsCount, contactsCount, accountsCount, opportunitiesCount, tasksCount] = stats;
  const plan = org.plan as keyof typeof planLimits;
  const aiUsagePercent = (org.aiCallsThisMonth / org.aiCallsLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{org.name}</h3>
              <p className="text-muted-foreground">@{org.slug}</p>
            </div>
            <Badge className={`ml-auto ${planColors[plan]}`}>{plan}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Organization ID</p>
              <p className="font-mono text-xs">{org.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm">
                {new Date(org.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>
            Current usage across all modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{leadsCount}</p>
              <p className="text-sm text-muted-foreground">Leads</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{contactsCount}</p>
              <p className="text-sm text-muted-foreground">Contacts</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{accountsCount}</p>
              <p className="text-sm text-muted-foreground">Accounts</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{opportunitiesCount}</p>
              <p className="text-sm text-muted-foreground">Opportunities</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{tasksCount}</p>
              <p className="text-sm text-muted-foreground">Tasks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Usage
          </CardTitle>
          <CardDescription>
            Monthly AI call usage for your plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>AI Calls This Month</span>
              <span>
                {org.aiCallsThisMonth} / {org.aiCallsLimit}
              </span>
            </div>
            <Progress value={aiUsagePercent} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Plan Limit</p>
              <p className="font-semibold">{planLimits[plan].aiCalls} calls/month</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Storage</p>
              <p className="font-semibold">{planLimits[plan].storage}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Info */}
      <Card>
        <CardHeader>
          <CardTitle>Plan & Billing</CardTitle>
          <CardDescription>
            Manage your subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Current Plan: {plan}</p>
              <p className="text-sm text-muted-foreground">
                {plan === "FREE"
                  ? "Upgrade to unlock more features"
                  : "Thank you for being a subscriber!"}
              </p>
            </div>
            {plan === "FREE" && (
              <Badge variant="outline" className="text-primary border-primary">
                Upgrade Available
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
