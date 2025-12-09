import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { 
  ArrowLeft, 
  Edit, 
  Trash2,
  Users,
  Zap,
  Megaphone,
  Filter,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { SegmentActions } from "./_components/segment-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const operatorLabels: Record<string, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  starts_with: "starts with",
  ends_with: "ends with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
};

export default async function SegmentDetailPage({ params }: PageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const segment = await prisma.segment.findFirst({
    where: { id, orgId },
    include: {
      campaigns: {
        select: { id: true, name: true, status: true, type: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: {
        select: { campaigns: true },
      },
    },
  });

  if (!segment) {
    notFound();
  }

  const rules = segment.rules as Array<{ field: string; operator: string; value?: string }> | null;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/marketing/segments">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Segments
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${segment.type === "DYNAMIC" ? "bg-purple-100" : "bg-blue-100"}`}>
            {segment.type === "DYNAMIC" ? (
              <Zap className="h-6 w-6 text-purple-600" />
            ) : (
              <Users className="h-6 w-6 text-blue-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{segment.name}</h1>
              <Badge variant={segment.isActive ? "default" : "secondary"}>
                {segment.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">{segment.type}</Badge>
            </div>
            {segment.description && (
              <p className="text-muted-foreground mt-1">{segment.description}</p>
            )}
          </div>
        </div>
        <SegmentActions segment={segment} />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-3xl">{segment.memberCount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            {segment.lastCalculatedAt && (
              <p className="text-xs text-muted-foreground">
                Last calculated: {format(new Date(segment.lastCalculatedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Campaigns Using</CardDescription>
            <CardTitle className="text-3xl">{segment._count.campaigns}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rule Logic</CardDescription>
            <CardTitle className="text-3xl">{segment.ruleLogic}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {segment.ruleLogic === "AND" ? "All rules must match" : "Any rule can match"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Rules */}
          {segment.type === "DYNAMIC" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Segment Rules
                </CardTitle>
                <CardDescription>
                  {rules && rules.length > 0 
                    ? `${rules.length} rule${rules.length !== 1 ? "s" : ""} defined`
                    : "No rules defined"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rules && rules.length > 0 ? (
                  <div className="space-y-3">
                    {rules.map((rule, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        {index > 0 && (
                          <Badge variant="outline" className="mr-2">
                            {segment.ruleLogic}
                          </Badge>
                        )}
                        <span className="font-medium capitalize">{rule.field}</span>
                        <span className="text-muted-foreground">
                          {operatorLabels[rule.operator] || rule.operator}
                        </span>
                        {rule.value && (
                          <span className="font-medium">"{rule.value}"</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No rules defined. Add rules to automatically include members.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Campaigns Using This Segment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {segment.campaigns.length > 0 ? (
                <div className="space-y-3">
                  {segment.campaigns.map((campaign) => (
                    <Link 
                      key={campaign.id} 
                      href={`/marketing/campaigns/${campaign.id}`}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Megaphone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{campaign.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{campaign.type}</Badge>
                        <Badge variant={campaign.status === "ACTIVE" ? "default" : "secondary"}>
                          {campaign.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No campaigns are using this segment yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Type</span>
                <p className="font-medium flex items-center gap-2">
                  {segment.type === "DYNAMIC" ? (
                    <Zap className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  {segment.type}
                </p>
              </div>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <p className="font-medium">{segment.isActive ? "Active" : "Inactive"}</p>
              </div>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Created</span>
                <p className="font-medium">
                  {format(new Date(segment.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <p className="font-medium">
                  {format(new Date(segment.updatedAt), "MMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalculate Members
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/marketing/campaigns/new?segmentId=${segment.id}`}>
                  <Megaphone className="h-4 w-4 mr-2" />
                  Create Campaign
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
