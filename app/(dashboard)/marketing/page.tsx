import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Megaphone, 
  UsersRound, 
  FileInput,
  Plus,
  ArrowRight,
  TrendingUp,
  Eye,
  Send,
  MousePointerClick,
} from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-purple-100 text-purple-700",
};

export default async function MarketingDashboardPage() {
  const { orgId } = await getAuthContext();

  // Fetch counts and recent items
  const [
    campaignCount,
    activeCampaigns,
    segmentCount,
    formCount,
    recentCampaigns,
    recentSegments,
    totalMembers,
    formStats,
  ] = await Promise.all([
    prisma.campaign.count({ where: { orgId } }),
    prisma.campaign.count({ where: { orgId, status: "ACTIVE" } }),
    prisma.segment.count({ where: { orgId } }),
    prisma.form.count({ where: { orgId } }),
    prisma.campaign.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        segment: { select: { name: true } },
      },
    }),
    prisma.segment.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.segment.aggregate({
      where: { orgId },
      _sum: { memberCount: true },
    }),
    prisma.form.aggregate({
      where: { orgId },
      _sum: { views: true, submissions: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Hub</h1>
          <p className="text-muted-foreground">
            Campaigns, segments, and lead generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/marketing/campaigns/new">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Campaigns</CardDescription>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignCount}</div>
            <p className="text-xs text-muted-foreground">
              {activeCampaigns} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Segments</CardDescription>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segmentCount}</div>
            <p className="text-xs text-muted-foreground">
              {(totalMembers._sum.memberCount || 0).toLocaleString()} total members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Forms</CardDescription>
            <FileInput className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formCount}</div>
            <p className="text-xs text-muted-foreground">
              {(formStats._sum.submissions || 0).toLocaleString()} submissions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Form Conversion</CardDescription>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formStats._sum.views && formStats._sum.views > 0
                ? (((formStats._sum.submissions || 0) / formStats._sum.views) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {(formStats._sum.views || 0).toLocaleString()} views
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Latest marketing campaigns</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/marketing/campaigns">
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length > 0 ? (
              <div className="space-y-4">
                {recentCampaigns.map((campaign) => (
                  <Link 
                    key={campaign.id} 
                    href={`/marketing/campaigns/${campaign.id}`}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{campaign.name}</span>
                        <Badge className={statusColors[campaign.status]} variant="secondary">
                          {campaign.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {campaign.type}
                        {campaign.segment && ` • ${campaign.segment.name}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(campaign.createdAt), "MMM d")}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Megaphone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No campaigns yet</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href="/marketing/campaigns/new">Create Campaign</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Segments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Segments</CardTitle>
              <CardDescription>Audience segments</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/marketing/segments">
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentSegments.length > 0 ? (
              <div className="space-y-4">
                {recentSegments.map((segment) => (
                  <Link 
                    key={segment.id} 
                    href={`/marketing/segments/${segment.id}`}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{segment.name}</span>
                        <Badge variant={segment.isActive ? "default" : "secondary"}>
                          {segment.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {segment.memberCount.toLocaleString()} members
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(segment.createdAt), "MMM d")}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <UsersRound className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No segments yet</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href="/marketing/segments/new">Create Segment</Link>
                </Button>
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
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/marketing/campaigns/new">
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <Megaphone className="h-8 w-8 text-orange-500 mb-2" />
                <h3 className="font-medium">Create Campaign</h3>
                <p className="text-sm text-muted-foreground">
                  Launch a new marketing campaign
                </p>
              </div>
            </Link>
            <Link href="/marketing/segments/new">
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <UsersRound className="h-8 w-8 text-purple-500 mb-2" />
                <h3 className="font-medium">Create Segment</h3>
                <p className="text-sm text-muted-foreground">
                  Define a new audience segment
                </p>
              </div>
            </Link>
            <Link href="/marketing/forms/new">
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <FileInput className="h-8 w-8 text-blue-500 mb-2" />
                <h3 className="font-medium">Create Form</h3>
                <p className="text-sm text-muted-foreground">
                  Build a lead capture form
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
