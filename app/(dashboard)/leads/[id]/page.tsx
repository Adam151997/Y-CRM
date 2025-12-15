import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  Building2,
  User,
  MessageSquare,
  CheckSquare,
  Activity,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { LeadNotes } from "./_components/lead-notes";
import { LeadTasks } from "./_components/lead-tasks";
import { LeadTimeline } from "./_components/lead-timeline";
import { LeadActions } from "./_components/lead-actions";
import { AssigneeDisplay } from "@/components/forms/assignee-selector";
import { CustomFieldsDisplay } from "@/components/forms/custom-fields-renderer";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  CONTACTED: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  QUALIFIED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  CONVERTED: "bg-green-500/10 text-green-500 border-green-500/20",
  LOST: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { orgId, userId } = await getAuthContext();
  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id, orgId },
    include: {
      pipelineStage: true,
      notes: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      tasks: {
        orderBy: { dueDate: "asc" },
      },
      activities: {
        orderBy: { performedAt: "desc" },
        take: 20,
      },
    },
  });

  if (!lead) {
    notFound();
  }

  const pendingTasks = lead.tasks.filter(
    (t) => t.status === "PENDING" || t.status === "IN_PROGRESS"
  );

  const customFieldValues = (lead.customFields as Record<string, unknown>) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/leads">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {lead.firstName[0]}
              {lead.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {lead.firstName} {lead.lastName}
              </h1>
              <Badge
                variant="outline"
                className={statusColors[lead.status] || ""}
              >
                {lead.status}
              </Badge>
              {lead.pipelineStage && (
                <Badge
                  variant="outline"
                  style={{
                    borderColor: lead.pipelineStage.color || undefined,
                    color: lead.pipelineStage.color || undefined,
                  }}
                >
                  {lead.pipelineStage.name}
                </Badge>
              )}
            </div>
            {lead.title && lead.company && (
              <p className="text-muted-foreground mt-1">
                {lead.title} at {lead.company}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Added {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-14 sm:ml-0">
          <LeadActions lead={lead} />
          <Button asChild>
            <Link href={`/leads/${lead.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-sm hover:underline"
                  >
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-sm hover:underline"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.company}</span>
                </div>
              )}
              {lead.source && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Source: {lead.source.replace("_", " ")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(lead.createdAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{format(new Date(lead.updatedAt), "MMM d, yyyy")}</span>
              </div>
              {lead.convertedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Converted</span>
                  <span>
                    {format(new Date(lead.convertedAt), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Assigned To</span>
                <AssigneeDisplay assigneeId={lead.assignedToId} />
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Info</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomFieldsDisplay
                module="LEAD"
                values={customFieldValues}
              />
              {Object.keys(customFieldValues).length === 0 && (
                <p className="text-sm text-muted-foreground">No custom fields set</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="timeline" className="space-y-4">
            <TabsList>
              <TabsTrigger value="timeline" className="gap-2">
                <Activity className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes ({lead.notes.length})
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2">
                <CheckSquare className="h-4 w-4" />
                Tasks ({pendingTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <LeadTimeline
                activities={lead.activities}
                leadId={lead.id}
                orgId={orgId}
              />
            </TabsContent>

            <TabsContent value="notes">
              <LeadNotes
                notes={lead.notes}
                leadId={lead.id}
                orgId={orgId}
                userId={userId}
              />
            </TabsContent>

            <TabsContent value="tasks">
              <LeadTasks
                tasks={lead.tasks}
                leadId={lead.id}
                orgId={orgId}
                userId={userId}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
