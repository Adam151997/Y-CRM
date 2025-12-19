import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  ArrowLeft, 
  Play,
  CheckCircle,
  Calendar,
  Building2,
  Zap,
  Settings,
  Copy,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { RunPlaybookButton } from "./_components/run-playbook-button";
import { PlaybookActions } from "./_components/playbook-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PlaybookStep {
  order: number;
  dayOffset: number;
  title: string;
  description?: string;
  taskType: string;
  assigneeType: string;
}

interface TriggerConfig {
  daysBeforeRenewal?: number;
  healthScoreThreshold?: number;
}

const triggerLabels: Record<string, string> = {
  MANUAL: "Manual Start",
  NEW_CUSTOMER: "New Customer",
  RENEWAL_APPROACHING: "Renewal Approaching",
  HEALTH_DROP: "Health Score Drop",
  TICKET_ESCALATION: "Ticket Escalation",
};

const triggerDescriptions: Record<string, string> = {
  MANUAL: "Start manually for any account",
  NEW_CUSTOMER: "Starts when account type becomes CUSTOMER",
  RENEWAL_APPROACHING: "Starts before renewal end date",
  HEALTH_DROP: "Starts when health score drops below threshold",
  TICKET_ESCALATION: "Starts when ticket priority becomes URGENT",
};

const taskTypeLabels: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  FOLLOW_UP: "Follow-up",
  ONBOARDING: "Onboarding",
  RENEWAL: "Renewal",
  OTHER: "Other",
};

const runStatusColors: Record<string, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
};

export default async function PlaybookDetailPage({ params }: PageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const playbook = await prisma.playbook.findFirst({
    where: { id, orgId },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!playbook) {
    notFound();
  }

  const steps = (playbook.steps as unknown as PlaybookStep[]) || [];
  const triggerConfig = (playbook.triggerConfig as TriggerConfig) || {};
  
  // Get account names for runs
  const accountIds = playbook.runs.map(r => r.accountId);
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, name: true },
  });
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));

  // Stats
  const activeRuns = playbook.runs.filter(r => r.status === "IN_PROGRESS").length;
  const completedRuns = playbook.runs.filter(r => r.status === "COMPLETED").length;

  // Format trigger config display
  const getTriggerConfigDisplay = () => {
    if (playbook.trigger === "RENEWAL_APPROACHING" && triggerConfig.daysBeforeRenewal) {
      return `${triggerConfig.daysBeforeRenewal} days before renewal`;
    }
    if (playbook.trigger === "HEALTH_DROP" && triggerConfig.healthScoreThreshold) {
      return `When score drops below ${triggerConfig.healthScoreThreshold}`;
    }
    return null;
  };

  const triggerConfigDisplay = getTriggerConfigDisplay();

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/cs/playbooks">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Playbooks
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{playbook.name}</h1>
            <Badge variant={playbook.isActive ? "default" : "secondary"}>
              {playbook.isActive ? "Active" : "Inactive"}
            </Badge>
            {playbook.isTemplate && (
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                <Copy className="h-3 w-3 mr-1" />
                Template
              </Badge>
            )}
          </div>
          {playbook.description && (
            <p className="text-muted-foreground">{playbook.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{steps.length} steps</span>
            <span>•</span>
            <span>Created {formatDistanceToNow(new Date(playbook.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <RunPlaybookButton playbookId={playbook.id} playbookName={playbook.name} />
          <PlaybookActions playbook={playbook} />
        </div>
      </div>

      {/* Trigger Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">Trigger: {triggerLabels[playbook.trigger]}</h3>
                {playbook.trigger !== "MANUAL" && (
                  <Badge variant="outline" className="text-xs">
                    Automatic
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {triggerDescriptions[playbook.trigger]}
              </p>
              {triggerConfigDisplay && (
                <div className="flex items-center gap-2 mt-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{triggerConfigDisplay}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Runs</p>
                <p className="text-2xl font-bold">{activeRuns}</p>
              </div>
              <Play className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedRuns}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Duration</p>
                <p className="text-2xl font-bold">
                  {steps.length > 0 ? Math.max(...steps.map(s => s.dayOffset)) : 0} days
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Playbook Steps</CardTitle>
            <CardDescription>
              Tasks that will be created when this playbook runs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              
              <div className="space-y-6">
                {steps.map((step, index) => (
                  <div key={index} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                      <span className="text-xs font-medium">{step.order}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          Day {step.dayOffset}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {taskTypeLabels[step.taskType] || step.taskType}
                        </Badge>
                      </div>
                      <h4 className="font-medium">{step.title}</h4>
                      {step.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {step.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned to: {step.assigneeType}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Runs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Runs</CardTitle>
            <CardDescription>
              Active and recent playbook executions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {playbook.runs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No runs yet</p>
                <p className="text-sm">
                  {playbook.trigger === "MANUAL" 
                    ? "Start this playbook for an account" 
                    : "Runs will appear when triggered automatically"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {playbook.runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">
                          {accountMap.get(run.accountId) || "Unknown Account"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            Started {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                          </span>
                          <span>•</span>
                          <span>
                            Step {run.currentStep}/{run.totalSteps}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className={runStatusColors[run.status]}>
                      {run.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
