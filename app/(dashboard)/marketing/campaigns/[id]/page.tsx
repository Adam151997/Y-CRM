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
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Mail, 
  Share2, 
  Calendar as CalendarIcon,
  Monitor,
  MessageSquare,
  Megaphone,
  Users,
  Send,
  Eye,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { CampaignActions } from "./_components/campaign-actions";

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
        select: { id: true, name: true, memberCount: true },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const TypeIcon = typeIcons[campaign.type] || Megaphone;
  const metrics = campaign.metrics as Record<string, number> | null;

  // Calculate rates
  const openRate = metrics?.sent && metrics?.opened 
    ? ((metrics.opened / metrics.sent) * 100).toFixed(1) 
    : null;
  const clickRate = metrics?.sent && metrics?.clicked 
    ? ((metrics.clicked / metrics.sent) * 100).toFixed(1) 
    : null;
  const conversionRate = metrics?.sent && metrics?.converted 
    ? ((metrics.converted / metrics.sent) * 100).toFixed(1) 
    : null;

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

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Metrics */}
          {metrics && Object.keys(metrics).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  {metrics.sent !== undefined && (
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Send className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-2xl font-bold">{metrics.sent.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Sent</div>
                    </div>
                  )}
                  {metrics.opened !== undefined && (
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Eye className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-2xl font-bold">{metrics.opened.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        Opened {openRate && `(${openRate}%)`}
                      </div>
                    </div>
                  )}
                  {metrics.clicked !== undefined && (
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <MousePointerClick className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-2xl font-bold">{metrics.clicked.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        Clicked {clickRate && `(${clickRate}%)`}
                      </div>
                    </div>
                  )}
                  {metrics.converted !== undefined && (
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <TrendingUp className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-2xl font-bold">{metrics.converted.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        Converted {conversionRate && `(${conversionRate}%)`}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Preview */}
          {campaign.type === "EMAIL" && campaign.subject && (
            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Subject:</span>
                    <p className="font-medium">{campaign.subject}</p>
                  </div>
                  {campaign.content && (
                    <div>
                      <span className="text-sm text-muted-foreground">Content Preview:</span>
                      <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm">Content editor coming soon...</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No metrics yet */}
          {(!metrics || Object.keys(metrics).length === 0) && campaign.status === "DRAFT" && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Campaign Not Started</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  This campaign is still in draft mode. Schedule or launch it to start collecting metrics.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
              <div>
                <span className="text-sm text-muted-foreground">Target Segment</span>
                {campaign.segment ? (
                  <Link 
                    href={`/marketing/segments/${campaign.segment.id}`}
                    className="font-medium text-primary hover:underline flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    {campaign.segment.name} ({campaign.segment.memberCount})
                  </Link>
                ) : (
                  <p className="font-medium text-muted-foreground">All contacts</p>
                )}
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
            </CardContent>
          </Card>

          {/* Budget (if applicable) */}
          {(campaign.budget || campaign.spent) && (
            <Card>
              <CardHeader>
                <CardTitle>Budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaign.budget && (
                  <div>
                    <span className="text-sm text-muted-foreground">Budget</span>
                    <p className="font-medium">${Number(campaign.budget).toLocaleString()}</p>
                  </div>
                )}
                {campaign.spent && (
                  <div>
                    <span className="text-sm text-muted-foreground">Spent</span>
                    <p className="font-medium">${Number(campaign.spent).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
