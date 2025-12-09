import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Megaphone, Mail, Share2, Calendar, Monitor, MessageSquare, Search } from "lucide-react";
import { format } from "date-fns";

interface PageProps {
  searchParams: Promise<{ 
    status?: string;
    type?: string;
    page?: string;
  }>;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const typeIcons: Record<string, typeof Mail> = {
  EMAIL: Mail,
  SOCIAL: Share2,
  EVENT: Calendar,
  WEBINAR: Monitor,
  SMS: MessageSquare,
  ADS: Megaphone,
};

export default async function CampaignsPage({ searchParams }: PageProps) {
  const { orgId } = await getAuthContext();
  const params = await searchParams;
  
  const status = params.status;
  const type = params.type;
  const page = parseInt(params.page || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  if (status && status !== "_all") where.status = status;
  if (type && type !== "_all") where.type = type;

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        segment: {
          select: { id: true, name: true, memberCount: true },
        },
      },
    }),
    prisma.campaign.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Get stats
  const stats = await prisma.campaign.groupBy({
    by: ["status"],
    where: { orgId },
    _count: true,
  });
  
  const statsMap = Object.fromEntries(stats.map(s => [s.status, s._count]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage marketing campaigns
          </p>
        </div>
        <Button asChild>
          <Link href="/marketing/campaigns/new">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Campaigns</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl text-green-600">{statsMap.ACTIVE || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scheduled</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{statsMap.SCHEDULED || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Draft</CardDescription>
            <CardTitle className="text-3xl text-slate-600">{statsMap.DRAFT || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <div className="flex gap-1">
                {["_all", "DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED"].map((s) => (
                  <Link
                    key={s}
                    href={`/marketing/campaigns?status=${s}${type ? `&type=${type}` : ""}`}
                  >
                    <Badge
                      variant={status === s || (!status && s === "_all") ? "default" : "outline"}
                      className="cursor-pointer"
                    >
                      {s === "_all" ? "All" : s}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              <div className="flex gap-1">
                {["_all", "EMAIL", "SOCIAL", "EVENT", "WEBINAR"].map((t) => (
                  <Link
                    key={t}
                    href={`/marketing/campaigns?type=${t}${status ? `&status=${status}` : ""}`}
                  >
                    <Badge
                      variant={type === t || (!type && t === "_all") ? "default" : "outline"}
                      className="cursor-pointer"
                    >
                      {t === "_all" ? "All" : t}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No campaigns found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first campaign
            </p>
            <Button asChild>
              <Link href="/marketing/campaigns/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const TypeIcon = typeIcons[campaign.type] || Megaphone;
            const metrics = campaign.metrics as Record<string, number> | null;
            
            return (
              <Link key={campaign.id} href={`/marketing/campaigns/${campaign.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-orange-100">
                        <TypeIcon className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{campaign.name}</h3>
                          <Badge className={statusColors[campaign.status]}>
                            {campaign.status}
                          </Badge>
                          <Badge variant="outline">{campaign.type}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {campaign.segment && (
                            <span>Segment: {campaign.segment.name} ({campaign.segment.memberCount})</span>
                          )}
                          {campaign.scheduledAt && (
                            <span>Scheduled: {format(new Date(campaign.scheduledAt), "MMM d, yyyy")}</span>
                          )}
                          <span>Created: {format(new Date(campaign.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      {metrics && (
                        <div className="hidden md:flex items-center gap-6 text-sm">
                          {metrics.sent !== undefined && (
                            <div className="text-center">
                              <div className="font-medium">{metrics.sent}</div>
                              <div className="text-muted-foreground">Sent</div>
                            </div>
                          )}
                          {metrics.opened !== undefined && (
                            <div className="text-center">
                              <div className="font-medium">{metrics.opened}</div>
                              <div className="text-muted-foreground">Opened</div>
                            </div>
                          )}
                          {metrics.clicked !== undefined && (
                            <div className="text-center">
                              <div className="font-medium">{metrics.clicked}</div>
                              <div className="text-muted-foreground">Clicked</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" asChild>
              <Link href={`/marketing/campaigns?page=${page - 1}${status ? `&status=${status}` : ""}${type ? `&type=${type}` : ""}`}>
                Previous
              </Link>
            </Button>
          )}
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" asChild>
              <Link href={`/marketing/campaigns?page=${page + 1}${status ? `&status=${status}` : ""}${type ? `&type=${type}` : ""}`}>
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
