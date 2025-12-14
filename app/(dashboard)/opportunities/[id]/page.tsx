import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Pencil,
  Target,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { OpportunityNotes } from "./_components/opportunity-notes";
import { OpportunityTasks } from "./_components/opportunity-tasks";
import { OpportunityActions } from "./_components/opportunity-actions";
import { OpportunityTimeline } from "./_components/opportunity-timeline";
import { AssigneeDisplay } from "@/components/forms/assignee-selector";
import { CustomFieldsDisplay } from "@/components/forms/custom-fields-renderer";

interface OpportunityDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(value: unknown, currency: string): string {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export default async function OpportunityDetailPage({ params }: OpportunityDetailPageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const opportunity = await prisma.opportunity.findFirst({
    where: { id, orgId },
    include: {
      account: {
        select: { id: true, name: true, industry: true },
      },
      stage: true,
      notes: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      tasks: {
        orderBy: { dueDate: "asc" },
        where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
        take: 5,
      },
      _count: {
        select: { notes: true, tasks: true },
      },
    },
  });

  if (!opportunity) {
    notFound();
  }

  // Fetch all stages for timeline
  const allStages = await prisma.pipelineStage.findMany({
    where: { orgId, module: "OPPORTUNITY" },
    orderBy: { order: "asc" },
  });

  const weightedValue = Number(opportunity.value) * (opportunity.probability / 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{opportunity.name}</h2>
              {opportunity.closedWon !== null && (
                <Badge
                  className={
                    opportunity.closedWon
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                  }
                >
                  {opportunity.closedWon ? "Won" : "Lost"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Link
                href={`/accounts/${opportunity.account.id}`}
                className="flex items-center text-muted-foreground hover:text-primary"
              >
                <Building2 className="h-4 w-4 mr-1" />
                {opportunity.account.name}
              </Link>
              {opportunity.account.industry && (
                <span className="text-muted-foreground">
                  • {opportunity.account.industry}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <Badge
                variant="outline"
                style={{
                  borderColor: opportunity.stage.color || undefined,
                  color: opportunity.stage.color || undefined,
                }}
              >
                {opportunity.stage.name}
              </Badge>
              {opportunity.expectedCloseDate && (
                <span className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-1" />
                  Expected: {format(new Date(opportunity.expectedCloseDate), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OpportunityActions
            opportunityId={opportunity.id}
            opportunityName={opportunity.name}
            isClosed={opportunity.closedWon !== null}
          />
          <Button asChild>
            <Link href={`/opportunities/${opportunity.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(Number(opportunity.value), opportunity.currency)}
                </p>
                <p className="text-sm text-muted-foreground">Deal Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Probability</span>
                <span className="text-sm font-medium">{opportunity.probability}%</span>
              </div>
              <Progress value={opportunity.probability} className="h-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(weightedValue, opportunity.currency)}
                </p>
                <p className="text-sm text-muted-foreground">Weighted Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {opportunity.expectedCloseDate
                    ? format(new Date(opportunity.expectedCloseDate), "MMM d")
                    : "-"}
                </p>
                <p className="text-sm text-muted-foreground">Close Date</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Progress & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pipeline Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <OpportunityTimeline
              stages={allStages}
              currentStageId={opportunity.stageId}
              closedWon={opportunity.closedWon}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Owner</span>
                <AssigneeDisplay assigneeId={opportunity.assignedToId} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Additional Info</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomFieldsDisplay
                module="OPPORTUNITY"
                values={(opportunity.customFields as Record<string, unknown>) || {}}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="notes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notes">
            Notes ({opportunity._count.notes})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks ({opportunity._count.tasks})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes">
          <OpportunityNotes opportunityId={opportunity.id} initialNotes={opportunity.notes} />
        </TabsContent>

        <TabsContent value="tasks">
          <OpportunityTasks opportunityId={opportunity.id} initialTasks={opportunity.tasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
