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
  Mail, 
  Share2, 
  Calendar as CalendarIcon,
  Monitor,
  MessageSquare,
  Megaphone,
  Users,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { CampaignActions } from "./_components/campaign-actions";
import { MetricsEditor } from "./_components/metrics-editor";
import { StatusManager } from "./_components/status-manager";
import { ContentEditor } from "./_components/content-editor";
import { PerformanceFunnel } from "./_components/performance-funnel";

interface PageProps {
  params: Promise<{ id: string }>;
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
  EVENT: CalendarIcon,
  WEBINAR: Monitor,
  SMS: MessageSquare,
  ADS: Megaphone,
};

export default async function CampaignDetailPage({ params }: PageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, orgId },
    include: {
      segment: {
        select: { 
          id: true, 
          name: true, 
          memberCount: true,
          targetEntity: true,
          type: true,
        },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const TypeIcon = typeIcons[campaign.type] || Megaphone;
  const metrics = campaign.metrics as Record<string, number> | null;
  const content = campaign.content as Record<string, string> | null;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/marketing/campaigns">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-orange-100">
            <TypeIcon className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <Badge className={statusColors[campaign.status]}>
                {campaign.status}
              </Badge>
              <Badge variant="outline">{campaign.type}</Badge>
            </div>
            {campaign.description && (
              <p className="text-muted-foreground mt-1">{campaign.description}</p>
            )}
          </div>
        </div>
        <CampaignActions campaign={campaign} />
      </div>

      {/* Status Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Status</CardTitle>
          <CardDescription>Track and manage campaign progress</CardDescription>
        </CardHeader>
        <CardContent>
          <StatusManager campaignId={campaign.id} currentStatus={campaign.status} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Performance Funnel - Show if has metrics */}
          <PerformanceFunnel metrics={metrics} campaignType={campaign.type} />

          {/* Metrics Entry - Always show for easy editing */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Campaign Metrics</CardTitle>
                <CardDescription>
                  {metrics && Object.keys(metrics).length > 0 
                    ? "Track your campaign performance"
                    : "Enter metrics to track performance"}
                </CardDescription>
              </div>
              <MetricsEditor 
                campaignId={campaign.id} 
                initialMetrics={metrics}
                campaignType={campaign.type}
              />
            </CardHeader>
            {metrics && Object.keys(metrics).length > 0 && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {metrics.sent !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold">{metrics.sent.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Sent</div>
                    </div>
                  )}
                  {metrics.opened !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold">{metrics.opened.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {campaign.type === "EMAIL" ? "Opened" : "Impressions"}
                      </div>
                    </div>
                  )}
                  {metrics.clicked !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold">{metrics.clicked.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {campaign.type === "EMAIL" ? "Clicked" : "Engagements"}
                      </div>
                    </div>
                  )}
                  {metrics.converted !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold">{metrics.converted.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Converted</div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Campaign Content & Notes */}
          <ContentEditor 
            campaignId={campaign.id}
            subject={campaign.subject}
            content={content}
            campaignType={campaign.type}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Target Segment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Target Audience
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.segment ? (
                <Link 
                  href={`/marketing/segments/${campaign.segment.id}`}
                  className="block p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="font-medium">{campaign.segment.name}</div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span>{campaign.segment.memberCount.toLocaleString()} members</span>
                    <span>•</span>
                    <span>{campaign.segment.type}</span>
                    <span>•</span>
                    <span>{campaign.segment.targetEntity === "LEAD" ? "Leads" : "Contacts"}</span>
                  </div>
                </Link>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-medium text-muted-foreground">No segment selected</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Campaign targets all contacts
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget (if applicable) */}
          {(campaign.budget || campaign.type === "ADS") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium">
                    ${campaign.budget ? Number(campaign.budget).toLocaleString() : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-medium">
                    ${campaign.spent ? Number(campaign.spent).toLocaleString() : "0"}
                  </span>
                </div>
                {campaign.budget && campaign.spent && (
                  <div className="pt-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ 
                          width: `${Math.min((Number(campaign.spent) / Number(campaign.budget)) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      {((Number(campaign.spent) / Number(campaign.budget)) * 100).toFixed(1)}% used
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Type</span>
                <p className="font-medium flex items-center gap-2">
                  <TypeIcon className="h-4 w-4" />
                  {campaign.type}
                </p>
              </div>
              <Separator />
              {campaign.scheduledAt && (
                <>
                  <div>
                    <span className="text-sm text-muted-foreground">Scheduled</span>
                    <p className="font-medium">
                      {format(new Date(campaign.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <Separator />
                </>
              )}
              {campaign.startedAt && (
                <>
                  <div>
                    <span className="text-sm text-muted-foreground">Started</span>
                    <p className="font-medium">
                      {format(new Date(campaign.startedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <Separator />
                </>
              )}
              {campaign.completedAt && (
                <>
                  <div>
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <p className="font-medium">
                      {format(new Date(campaign.completedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <Separator />
                </>
              )}
              <div>
                <span className="text-sm text-muted-foreground">Created</span>
                <p className="font-medium">
                  {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <p className="font-medium">
                  {format(new Date(campaign.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
